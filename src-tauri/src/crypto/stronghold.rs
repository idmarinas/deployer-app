use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use iota_stronghold::{Client, KeyProvider, SnapshotPath, Stronghold as IotaStronghold};
use keyring::{Entry, Error as KeyringError};
use rand::{rngs::SysRng, TryRng};
use serde::Serialize;
use std::path::PathBuf;
use zeroize::Zeroizing;

const SERVICE_NAME: &str = "deployer-app";
const VAULT_PASSWORD_ACCOUNT: &str = "stronghold-vault";
const VAULT_FILE_NAME: &str = "vault.hold";
const CLIENT_NAME: &str = "encrypt-keys";

/// Scopes de cifrado esperados en el vault.
const EXPECTED_SCOPES: &[&str] = &[
    "encrypt:deployer_hosts.password",
    "encrypt:deployer_passkeys.key_content",
    "encrypt:deployer_passkeys.passphrase",
];

/// Reporte de salud del vault de Stronghold.
#[derive(Serialize)]
pub struct VaultHealthReport {
    pub vault_file_exists: bool,
    pub salt_file_exists: bool,
    pub snapshot_loaded: bool,
    pub client_exists: bool,
    pub keys_found: Vec<String>,
    pub expected_scopes: Vec<String>,
    pub missing_scopes: Vec<String>,
}

/// Acceso de SOLO LECTURA al vault de Stronghold para claves de cifrado.
///
/// La escritura sobre el vault (creación/rotación/purga de claves) la realiza
/// el frontend con el plugin de Stronghold. Rust solo abre el vault para leer
/// claves y descifrar credenciales SSH, de modo que no hay contención entre
/// ambos accesos.
///
/// Las claves se guardan versionadas: `encrypt:{table}.{col}:{version}`.
/// La versión actual se guarda en `encrypt:{table}.{col}:current`.
/// Un valor cifrado en SQLite tiene formato `ENC:{version}:<base64>`.
pub struct StrongholdVault {
    client: Client,
}

impl StrongholdVault {
    /// Abre el vault (solo lectura) calculando rutas desde `app_local_data_dir`.
    /// El vault se comparte con el plugin Tauri JS, que usa el mismo salt
    /// y la misma password para acceder al mismo archivo.
    ///
    /// Devuelve error si el archivo de vault no existe o si el client
    /// `encrypt-keys` no se encuentra en el snapshot (vault vacío o corrupto).
    pub fn open(app: &tauri::AppHandle) -> Result<Self, String> {
        use tauri::Manager;
        let data_dir = app
            .path()
            .app_local_data_dir()
            .map_err(|e| format!("Error al obtener directorio de datos: {}", e))?;
        let vault_path = data_dir.join(VAULT_FILE_NAME);
        let salt_path = data_dir.join("salt.txt");

        if !vault_path.exists() {
            return Err(format!(
                "Vault no encontrado en '{}'. El frontend debe inicializar el vault antes de usar credenciales cifradas. Ejecuta la app completa al menos una vez.",
                vault_path.display()
            ));
        }

        let raw_password = get_or_create_vault_password()?;
        let password_hash = hash_password(&raw_password, &salt_path)?;

        let snapshot_path = SnapshotPath::from_path(&vault_path);
        let stronghold = IotaStronghold::default();
        let keyprovider = KeyProvider::try_from(Zeroizing::new(password_hash))
            .map_err(|e| format!("Error al crear KeyProvider: {:?}", e))?;

        stronghold
            .load_snapshot(&keyprovider, &snapshot_path)
            .map_err(|e| format!("Error al cargar snapshot de Stronghold: {:?}", e))?;

        // Cargar el client 'encrypt-keys' desde el snapshot a memoria.
        // load_snapshot NO puebla la tabla de clients en memoria: hay que llamar
        // load_client para traerlo desde el snapshot, igual que hace el plugin JS
        // con loadClient antes de usarlo.
        let client = stronghold
            .load_client(CLIENT_NAME)
            .map_err(|e| {
                format!(
                    "Client 'encrypt-keys' no encontrado en el snapshot: {:?}. \
                     El vault parece estar vacío o corrupto. \
                     Verifica que el frontend ha guardado claves en el vault.",
                    e
                )
            })?;

        Ok(Self { client })
    }

    /// Realiza un diagnóstico completo del vault sin intentar descifrar.
    /// Devuelve un reporte con el estado de cada componente.
    pub fn health_check(app: &tauri::AppHandle) -> VaultHealthReport {
        use tauri::Manager;

        let mut report = VaultHealthReport {
            vault_file_exists: false,
            salt_file_exists: false,
            snapshot_loaded: false,
            client_exists: false,
            keys_found: Vec::new(),
            expected_scopes: EXPECTED_SCOPES.iter().map(|s| s.to_string()).collect(),
            missing_scopes: Vec::new(),
        };

        let data_dir = match app.path().app_local_data_dir() {
            Ok(d) => d,
            Err(_) => return report,
        };

        let vault_path = data_dir.join(VAULT_FILE_NAME);
        let salt_path = data_dir.join("salt.txt");

        report.vault_file_exists = vault_path.exists();
        report.salt_file_exists = salt_path.exists();

        if !report.vault_file_exists {
            report.missing_scopes = report.expected_scopes.clone();
            return report;
        }

        let raw_password = match get_or_create_vault_password() {
            Ok(pw) => pw,
            Err(_) => return report,
        };

        let password_hash = match hash_password(&raw_password, &salt_path) {
            Ok(h) => h,
            Err(_) => return report,
        };

        let snapshot_path = SnapshotPath::from_path(&vault_path);
        let stronghold = IotaStronghold::default();
        let keyprovider = match KeyProvider::try_from(Zeroizing::new(password_hash)) {
            Ok(kp) => kp,
            Err(_) => return report,
        };

        if stronghold.load_snapshot(&keyprovider, &snapshot_path).is_err() {
            report.missing_scopes = report.expected_scopes.clone();
            return report;
        }

        report.snapshot_loaded = true;

        let client = match stronghold.load_client(CLIENT_NAME) {
            Ok(c) => c,
            Err(_) => {
                report.missing_scopes = report.expected_scopes.clone();
                return report;
            }
        };

        report.client_exists = true;

        for &scope in EXPECTED_SCOPES {
            let mut found = false;
            for version in 0..10 {
                let key_name = format!("{}:{}", scope, version);
                if client.store().get(key_name.as_bytes()).ok().flatten().is_some() {
                    report.keys_found.push(key_name);
                    found = true;
                }
            }
            if !found {
                report.missing_scopes.push(scope.to_string());
            }
        }

        report
    }

    /// Obtiene la clave AES de una versión concreta para un scope.
    pub fn get_key_for_version(&self, scope: &str, version: i64) -> Result<Vec<u8>, String> {
        let key_scope = format!("{}:{}", scope, version);
        let key = self
            .client
            .store()
            .get(key_scope.as_bytes())
            .map_err(|e| format!("Error al leer clave del store: {:?}", e))?
            .ok_or_else(|| {
                format!(
                    "Clave no encontrada: {}. La clave no existe en el vault. \
                     Asegúrate de que el frontend ha cifrado este campo al menos una vez.",
                    key_scope
                )
            })?;
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
