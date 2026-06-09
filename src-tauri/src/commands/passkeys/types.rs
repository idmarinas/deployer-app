use serde::{Deserialize, Serialize};
use ts_rs::TS;

use deployer_macros::DbEntity;

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
#[db_table("passkeys")]
pub struct Passkey {
    pub id: i64,
    pub name: String,
    #[db_encrypt(expose = false)]
    pub key_content: String,
    #[db_encrypt(expose = false)]
    pub passphrase: Option<String>,
    pub key_type: Option<KeyType>,
    pub fingerprint: Option<String>,
    pub description: Option<String>,
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
        Passkey {
            id: 0,
            name: self.name,
            key_content: self.key_content,
            passphrase: self.passphrase,
            key_type: self.key_type,
            fingerprint: self.fingerprint,
            description: self.description,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

// ============================================================================
// Input para actualizar una Passkey
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdatePasskeyInput {
    pub name: Option<String>,
    /// Si es `None`, no se modifica el contenido actual.
    /// Si es `Some("valor")`, se cifra y se guarda.
    pub key_content: Option<String>,
    /// Si es `None`, no se modifica la passphrase actual.
    /// Si es `Some("")`, se elimina la passphrase.
    pub passphrase: Option<String>,
    pub key_type: Option<KeyType>,
    pub fingerprint: Option<String>,
    pub description: Option<String>,
}
