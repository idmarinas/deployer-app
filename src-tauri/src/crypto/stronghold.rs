use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use iota_stronghold::{Client, KeyProvider, SnapshotPath, Stronghold as IotaStronghold};
use keyring::{Entry, Error as KeyringError};
use rand::{rngs::SysRng, TryRng};
use std::path::PathBuf;
use zeroize::Zeroizing;

const SERVICE_NAME: &str = "deployer-app";
const VAULT_PASSWORD_ACCOUNT: &str = "stronghold-vault";
const VAULT_FILE_NAME: &str = "vault.hold";
const CLIENT_NAME: &str = "encrypt-keys";

/// Sufijo de la entrada del store que guarda la versión actual de un campo.
const CURRENT_VERSION_SUFFIX: &str = ":current";

/// Wrapper que gestiona acceso al vault de Stronghold para claves de cifrado.
///
/// JS (plugin Tauri) y Rust (este módulo) abren el mismo archivo de vault.
/// `iota-stronghold` usa bloqueo a nivel de archivo para acceso concurrente seguro.
///
/// Las claves se guardan versionadas: `encrypt:{table}.{col}:{version}`.
/// La versión actual se guarda en `encrypt:{table}.{col}:current`.
/// Un valor cifrado en SQLite tiene formato `ENC:{version}:<base64>`.
pub struct StrongholdVault {
    stronghold: IotaStronghold,
    snapshot_path: SnapshotPath,
    keyprovider: KeyProvider,
}

impl StrongholdVault {
    /// Abre el vault. Calcula rutas basándose en `app_local_data_dir`.
    ///
    /// El vault se comparte con el plugin Tauri JS, que usa el mismo salt
    /// y la misma password para acceder al mismo archivo.
    pub fn open() -> Result<Self, String> {
        let data_dir = compute_data_dir()?;
        let vault_path = data_dir.join(VAULT_FILE_NAME);
        let salt_path = data_dir.join("salt.txt");

        let raw_password = get_or_create_vault_password()?;
        let password_hash = hash_password(&raw_password, &salt_path)?;

        let snapshot_path = SnapshotPath::from_path(&vault_path);
        let stronghold = IotaStronghold::default();
        let keyprovider = KeyProvider::try_from(Zeroizing::new(password_hash))
            .map_err(|e| format!("Error al crear KeyProvider: {:?}", e))?;

        if snapshot_path.exists() {
            stronghold
                .load_snapshot(&keyprovider, &snapshot_path)
                .map_err(|e| format!("Error al cargar snapshot de Stronghold: {:?}", e))?;
        }

        Ok(Self {
            stronghold,
            snapshot_path,
            keyprovider,
        })
    }

    /// Persiste el vault a disco.
    pub fn save(&self) -> Result<(), String> {
        self.stronghold
            .commit_with_keyprovider(&self.snapshot_path, &self.keyprovider)
            .map_err(|e| format!("Error al guardar vault: {:?}", e))?;
        Ok(())
    }

    /// Obtiene (migrando si es necesario) la versión actual de cifrado para un scope.
    ///
    /// `scope` es el identificador base del campo (`encrypt:deployer_hosts.password`).
    /// Devuelve un entero >= 0. La entrada `encrypt:{table}.{col}:current` guarda la
    /// versión actual; la clave se almacena en `encrypt:{table}.{col}:{version}`.
    ///
    /// Migración desde el formato sin versionar: si no existe `:current`,
    /// se comprueba si hay una clave legada en `encrypt:{table}.{col}`. Si existe,
    /// se migra a `encrypt:{table}.{col}:0`; si no, se crea una clave nueva en v0.
    pub fn get_current_version(&self, scope: &str) -> Result<i64, String> {
        let client = self.get_or_create_client()?;
        let store = client.store();

        let current_key = format!("{}{}", scope, CURRENT_VERSION_SUFFIX);
        if let Some(bytes) = store.get(current_key.as_bytes()).map_err(|e| {
            format!("Error al leer versión actual del store: {:?}", e)
        })? {
            if bytes.len() == 8 {
                let mut arr = [0u8; 8];
                arr.copy_from_slice(&bytes);
                return Ok(i64::from_be_bytes(arr));
            }
        }

        // No hay versión actual → migrar de formato legado o crear v0.
        let version = 0i64;
        let legacy_key = scope.as_bytes().to_vec();
        let versioned_key = format!("{}:{}", scope, version);

        let legacy = store
            .get(&legacy_key)
            .map_err(|e| format!("Error al leer clave legada: {:?}", e))?;

        if let Some(bytes) = legacy {
            store
                .insert(versioned_key.as_bytes().to_vec(), bytes.to_vec(), None)
                .map_err(|e| format!("Error al migrar clave legada: {:?}", e))?;
            store
                .delete(&legacy_key)
                .map_err(|e| format!("Error al borrar clave legada: {:?}", e))?;
        } else {
            let new_key = generate_random_key_32()?;
            store
                .insert(versioned_key.as_bytes().to_vec(), new_key, None)
                .map_err(|e| format!("Error al crear clave v0: {:?}", e))?;
        }

        store
            .insert(current_key.as_bytes().to_vec(), version.to_be_bytes().to_vec(), None)
            .map_err(|e| format!("Error al guardar versión actual: {:?}", e))?;
        self.save()?;

        Ok(version)
    }

    /// Obtiene la clave AES de una versión concreta para un scope.
    pub fn get_key_for_version(&self, scope: &str, version: i64) -> Result<Vec<u8>, String> {
        let key_scope = format!("{}:{}", scope, version);
        let client = self.get_or_create_client()?;
        let store = client.store();
        let key = store
            .get(key_scope.as_bytes())
            .map_err(|e| format!("Error al leer clave del store: {:?}", e))?
            .ok_or_else(|| format!("Clave no encontrada: {}", key_scope))?;
        Ok(key.to_vec())
    }

    /// Genera una nueva clave y la registra como la versión actual del scope.
    ///
    /// A diferencia de una rotación destructiva, **conserva** la clave anterior
    /// (y todas las anteriores): cada versión sigue disponible bajo su entrada,
    /// por lo que los valores ya cifrados con versiones viejas siguen descifrándose.
    /// Devuelve la nueva clave generada.
    pub fn rotate_key(&self, scope: &str) -> Result<Vec<u8>, String> {
        let current = self.get_current_version(scope)?;
        let new_version = current + 1;
        let new_key = generate_random_key_32()?;

        let client = self.get_or_create_client()?;
        let store = client.store();

        let versioned_key = format!("{}:{}", scope, new_version);
        store
            .insert(versioned_key.as_bytes().to_vec(), new_key.clone(), None)
            .map_err(|e| format!("Error al guardar nueva clave: {:?}", e))?;

        let current_key = format!("{}{}", scope, CURRENT_VERSION_SUFFIX);
        store
            .insert(
                current_key.as_bytes().to_vec(),
                new_version.to_be_bytes().to_vec(),
                None,
            )
            .map_err(|e| format!("Error al actualizar versión actual: {:?}", e))?;

        self.save()?;
        Ok(new_key)
    }

    /// Descifra un valor usando la clave de la versión con la que fue cifrado.
    ///
    /// El valor debe tener formato `ENC:{version}:<base64>`; los valores
    /// `ENC:<base64>` sin versión se tratan como versión 0.
    pub fn decrypt_value(&self, scope: &str, ciphertext: &str) -> Result<String, String> {
        let (version, payload) = split_ciphertext_version(ciphertext);
        let key = self.get_key_for_version(scope, version)?;
        decrypt_aes_gcm_payload(payload, &key)
    }

    /// Elimina la clave de una versión concreta (viejas tras purga).
    pub fn purge_version(&self, scope: &str, version: i64) -> Result<(), String> {
        if version == 0 {
            return Ok(());
        }
        let key_scope = format!("{}:{}", scope, version);
        let client = self.get_or_create_client()?;
        client
            .store()
            .delete(key_scope.as_bytes())
            .map_err(|e| format!("Error al purgar clave de versión {}: {:?}", version, e))?;
        Ok(())
    }

    fn get_or_create_client(&self) -> Result<Client, String> {
        self.stronghold
            .get_client(CLIENT_NAME)
            .or_else(|_| self.stronghold.create_client(CLIENT_NAME))
            .map_err(|e| format!("Error al obtener cliente Stronghold: {:?}", e))
    }
}

/// Separa la versión de un valor cifrado.
///
/// Formato: `ENC:{version}:<base64>`. Si no hay segmento de versión
/// (`ENC:<base64>`), se asume versión 0.
pub fn split_ciphertext_version(ciphertext: &str) -> (i64, &str) {
    if !ciphertext.starts_with("ENC:") {
        return (0, ciphertext);
    }

    let rest = &ciphertext[4..];

    // Buscar el primer ':' tras el prefijo. El base64 no contiene ':'.
    match rest.find(':') {
        Some(idx) if idx > 0 => {
            let version_str = &rest[..idx];
            let payload = &rest[idx + 1..];
            match version_str.parse::<i64>() {
                Ok(v) => (v, payload),
                Err(_) => (0, rest),
            }
        }
        _ => (0, rest),
    }
}

/// Cifra un texto plano con AES-256-GCM usando una clave dada y devuelve
/// el valor con formato `ENC:{version}:<base64(nonce12+cipher)>`.
pub fn encrypt_with_key(plaintext: &str, key: &[u8], version: i64) -> Result<String, String> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Error al inicializar el cifrado: {}", e))?;

    let mut nonce_bytes = [0u8; 12];
    SysRng
        .try_fill_bytes(&mut nonce_bytes)
        .map_err(|e| format!("Error al generar nonce: {}", e))?;
    let nonce = Nonce::from(nonce_bytes);

    let ciphertext = cipher
        .encrypt(&nonce, plaintext.as_bytes())
        .map_err(|e| format!("Error al cifrar: {}", e))?;

    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);

    Ok(format!("ENC:{}:{}", version, BASE64.encode(&combined)))
}

/// Descifra un payload AES-256-GCM (sin prefijo `ENC:`).
///
/// Formato del payload: `base64(nonce_12_bytes + ciphertext)`.
fn decrypt_aes_gcm_payload(payload: &str, key: &[u8]) -> Result<String, String> {
    let combined = BASE64
        .decode(payload)
        .map_err(|e| format!("Error al decodificar base64: {}", e))?;

    if combined.len() < 12 {
        return Err("Datos cifrados corruptos: longitud insuficiente".to_string());
    }

    let (nonce_bytes, encrypted_data) = combined.split_at(12);
    let nonce = Nonce::from(<[u8; 12]>::try_from(nonce_bytes).unwrap());

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Error al inicializar el cifrado: {}", e))?;

    let plaintext_bytes = cipher
        .decrypt(&nonce, encrypted_data)
        .map_err(|_| "Error al descifrar: clave incorrecta o datos corruptos".to_string())?;

    String::from_utf8(plaintext_bytes)
        .map_err(|e| format!("Error al decodificar texto descifrado: {}", e))
}

/// Calcula la ruta de datos local de la app (mismo directorio que Tauri).
fn compute_data_dir() -> Result<PathBuf, String> {
    let local = dirs::data_local_dir()
        .ok_or_else(|| "No se pudo obtener el directorio de datos local".to_string())?;
    Ok(local.join("DeployerApp"))
}

/// Obtiene la password del vault desde el keychain del SO.
/// En la primera ejecución, genera una password aleatoria y la persiste.
pub fn get_or_create_vault_password() -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, VAULT_PASSWORD_ACCOUNT)
        .map_err(|e| format!("Error al acceder al keychain: {}", e))?;

    match entry.get_password() {
        Ok(pw) => Ok(pw),
        Err(KeyringError::NoEntry) => {
            let pw = generate_random_password();
            entry
                .set_password(&pw)
                .map_err(|e| format!("Error al guardar password del vault: {}", e))?;
            Ok(pw)
        }
        Err(e) => Err(format!("Error al leer password del vault: {}", e)),
    }
}

/// Deriva la clave de cifrado del vault con Argon2 + salt.
///
/// Mismo algoritmo que `tauri_plugin_stronghold::kdf::KeyDerivation::argon2`,
/// usando el mismo archivo de salt que el plugin.
fn hash_password(password: &str, salt_path: &PathBuf) -> Result<Vec<u8>, String> {
    let mut salt = [0u8; 32];

    if salt_path.exists() {
        let data = std::fs::read(salt_path)
            .map_err(|e| format!("Error al leer salt: {}", e))?;
        if data.len() != 32 {
            return Err("Archivo de salt corrupto: longitud incorrecta".to_string());
        }
        salt.copy_from_slice(&data);
    } else {
        SysRng
            .try_fill_bytes(&mut salt)
            .map_err(|e| format!("Error al generar salt: {}", e))?;
        std::fs::write(salt_path, &salt)
            .map_err(|e| format!("Error al guardar salt: {}", e))?;
    }

    let hash = argon2::hash_raw(password.as_bytes(), &salt, &Default::default())
        .map_err(|e| format!("Error al derivar clave con Argon2: {:?}", e))?;

    Ok(hash)
}

fn generate_random_password() -> String {
    let mut bytes = [0u8; 32];
    SysRng.try_fill_bytes(&mut bytes).ok();
    hex::encode(bytes)
}

fn generate_random_key_32() -> Result<Vec<u8>, String> {
    let mut key = vec![0u8; 32];
    SysRng
        .try_fill_bytes(&mut key)
        .map_err(|e| format!("Error al generar clave AES: {}", e))?;
    Ok(key)
}
