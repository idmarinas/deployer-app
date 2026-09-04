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

/// Acceso de SOLO LECTURA al vault de Stronghold para claves de cifrado.///
/// La escritura sobre el vault (creación/rotación/purga de claves) la realiza
/// el frontend con el plugin de Stronghold. Rust solo abre el vault para leer
/// claves y descifrar credenciales SSH, de modo que no hay contención entre
/// ambos accesos.
///
/// Las claves se guardan versionadas: `encrypt:{table}.{col}:{version}`.
/// La versión actual se guarda en `encrypt:{table}.{col}:current`.
/// Un valor cifrado en SQLite tiene formato `ENC:{version}:<base64>`.
pub struct StrongholdVault {
    stronghold: IotaStronghold,
}

impl StrongholdVault {
    /// Abre el vault (solo lectura) calculando rutas desde `app_local_data_dir`.
    /// El vault se comparte con el plugin Tauri JS, que usa el mismo salt
    /// y la misma password para acceder al mismo archivo.
    pub fn open(app: &tauri::AppHandle) -> Result<Self, String> {
        use tauri::Manager;
        let data_dir = app
            .path()
            .app_local_data_dir()
            .map_err(|e| format!("Error al obtener directorio de datos: {}", e))?;
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

        Ok(Self { stronghold })
    }

    /// Obtiene la clave AES de una versión concreta para un scope.
    pub fn get_key_for_version(&self, scope: &str, version: i64) -> Result<Vec<u8>, String> {
        let key_scope = format!("{}:{}", scope, version);
        let client = self.get_or_create_client()?;
        let key = client
            .store()
            .get(key_scope.as_bytes())
            .map_err(|e| format!("Error al leer clave del store: {:?}", e))?
            .ok_or_else(|| format!("Clave no encontrada: {}", key_scope))?;
        Ok(key.to_vec())
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
        if let Some(parent) = salt_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Error al crear directorio del salt: {}", e))?;
        }
        SysRng
            .try_fill_bytes(&mut salt)
            .map_err(|e| format!("Error al generar salt: {}", e))?;
        std::fs::write(salt_path, &salt)
            .map_err(|e| format!("Error al guardar salt: {}", e))?;
    }

    argon2::hash_raw(password.as_bytes(), &salt, &Default::default())
        .map_err(|e| format!("Error al derivar clave con Argon2: {:?}", e))
}

fn generate_random_password() -> String {
    let mut bytes = [0u8; 32];
    SysRng.try_fill_bytes(&mut bytes).ok();
    hex::encode(bytes)
}
