use russh::keys::ssh_key::{Algorithm, HashAlg};
use russh::keys::PrivateKey;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use deployer_macros::DbEntity;

use crate::crypto;
use crate::patch::Patch;

// ============================================================================
// Enum KeyType
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS, sqlx::Type, Default)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "TEXT", rename_all = "lowercase")]
#[ts(export, export_to = "tauri-types.d.ts")]
pub enum KeyType {
    #[default]
    Rsa,
    Ed25519,
    Ecdsa,
}

impl std::fmt::Display for KeyType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            KeyType::Rsa => write!(f, "rsa"),
            KeyType::Ed25519 => write!(f, "ed25519"),
            KeyType::Ecdsa => write!(f, "ecdsa"),
        }
    }
}

impl std::str::FromStr for KeyType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "rsa" => Ok(KeyType::Rsa),
            "ed25519" => Ok(KeyType::Ed25519),
            "ecdsa" => Ok(KeyType::Ecdsa),
            other => Err(format!("Tipo de clave no válido: '{}'", other)),
        }
    }
}

// ============================================================================
// Entidad Passkey
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("deployer_passkeys")]
pub struct Passkey {
    pub id: i64,
    pub name: String,
    #[db_encrypt(expose = false)]
    pub key_content: String,
    #[db_encrypt(expose = false)]
    pub passphrase: Option<String>,
    pub key_type: Option<KeyType>,
    pub fingerprint: Option<String>,
    #[ts(type = "any")]
    pub description: Option<sqlx::types::Json<serde_json::Value>>,
    pub created_at: String,
    pub updated_at: String,
}

// ============================================================================
// Input para crear una Passkey
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreatePasskeyInput {
    pub name: String,
    pub key_content: String,
    pub passphrase: Option<String>,
    pub key_type: Option<KeyType>,
    pub fingerprint: Option<String>,
    pub description: Option<String>,
}

impl CreatePasskeyInput {
    pub fn into_passkey(self) -> Passkey {
        let derived = derive_fingerprint(&self.key_content, self.passphrase.as_deref());

        let fingerprint = if self.fingerprint.as_ref().is_some_and(|f| !f.trim().is_empty()) {
            self.fingerprint
        } else {
            derived.as_ref().ok().map(|(fp, _)| fp.clone())
        };

        let key_type = derived.as_ref().ok().map(|(_, t)| t.clone()).or(self.key_type);

        Passkey {
            id: 0,
            name: self.name,
            key_content: self.key_content,
            passphrase: self.passphrase,
            key_type,
            fingerprint,
            description: self.description.and_then(|s| serde_json::from_str(&s).ok()).map(sqlx::types::Json),
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

// ============================================================================
// Derivación del fingerprint y tipo a partir de la clave privada
// ============================================================================

/// Valida la clave privada y deriva su fingerprint SHA-256 (`SHA256:...`)
/// junto con el tipo real de la clave.
///
/// - Si la clave está cifrada, se descifra con la passphrase proporcionada.
/// - La passphrase proveniente de `generate_passkey` (prefijo `ENC:`) se ignora,
///   porque en ese caso el `key_content` nunca está cifrado.
pub(crate) fn derive_fingerprint(
    key_content: &str,
    passphrase: Option<&str>,
) -> Result<(String, KeyType), String> {
    let key = PrivateKey::from_openssh(key_content.as_bytes())
        .map_err(|_| "La clave privada no es válida.".to_string())?;

    let usable = passphrase.filter(|p| !p.trim().is_empty() && !crypto::is_encrypted(p));

    let key = match usable {
        Some(pp) => match key.decrypt(pp.as_bytes()) {
            Ok(k) => k,
            Err(e) if e.to_string().contains("already decrypted") => key,
            Err(_) => return Err("La passphrase no es válida.".to_string()),
        },
        None => {
            if key.is_encrypted() {
                return Err("La clave privada está protegida con passphrase.".to_string());
            }
            key
        }
    };

    let key_type = key_type_from_algorithm(&key.algorithm())?;
    let fingerprint = key.fingerprint(HashAlg::Sha256).to_string();

    Ok((fingerprint, key_type))
}

/// Mapea el algoritmo real de la clave al `KeyType` soportado por la app.
fn key_type_from_algorithm(alg: &Algorithm) -> Result<KeyType, String> {
    match alg {
        Algorithm::Ed25519 => Ok(KeyType::Ed25519),
        Algorithm::Rsa { .. } => Ok(KeyType::Rsa),
        Algorithm::Ecdsa { .. } => Ok(KeyType::Ecdsa),
        _ => Err("Tipo de clave no soportado.".to_string()),
    }
}

// ============================================================================
// Input para actualizar una Passkey
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdatePasskeyInput {
    #[ts(optional)]
    pub name: Option<String>,
    /// `NOT NULL` en BD: omitir = no modificar; valor = sustituir y volver a cifrar.
    #[ts(optional)]
    pub key_content: Option<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub passphrase: Patch<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub key_type: Patch<KeyType>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub fingerprint: Patch<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub description: Patch<String>,
}
