use serde::{Deserialize, Serialize};
use ts_rs::TS;

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
