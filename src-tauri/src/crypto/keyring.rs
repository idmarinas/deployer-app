use keyring::{Entry, Error as KeyringError};
use rand_core::{OsRng, RngCore};

/// Nombre del servicio en el keychain del sistema operativo.
const SERVICE_NAME: &str = "deployer-app";
/// Nombre de la cuenta bajo la que se guarda la clave maestra.
const ACCOUNT_NAME: &str = "master-key";
/// Prefijo que identifica valores cifrados en SQLite.
pub const ENCRYPTED_PREFIX: &str = "ENC:";

/// Obtiene la clave maestra del keychain del SO.
/// Si no existe, genera una nueva, la persiste y la devuelve.
pub fn get_or_create_master_key() -> Result<Vec<u8>, String> {
    let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME)
        .map_err(|e| format!("Error al crear entrada en keychain: {}", e))?;

    match entry.get_password() {
        Ok(stored) => hex::decode(&stored)
            .map_err(|e| format!("Error al decodificar la clave maestra: {}", e)),

        Err(KeyringError::NoEntry) => {
            // Primera ejecución: genera y persiste una clave de 32 bytes
            let key = generate_key();
            let hex_key = hex::encode(&key);
            entry
                .set_password(&hex_key)
                .map_err(|e| format!("Error al guardar la clave maestra en keychain: {}", e))?;
            Ok(key)
        }

        Err(e) => Err(format!("Error al acceder al keychain: {}", e)),
    }
}

/// Genera una clave aleatoria de 32 bytes usando el CSPRNG del SO.
fn generate_key() -> Vec<u8> {
    let mut key = vec![0u8; 32];
    OsRng.fill_bytes(&mut key);
    key
}
