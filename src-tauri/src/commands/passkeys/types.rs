use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::Row;
use ts_rs::TS;

use crate::db::DbEntity;

// ============================================================================
// Enum KeyType
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "TEXT", rename_all = "lowercase")]
#[ts(export, export_to = "tauri-types.d.ts")]
pub enum KeyType {
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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct Passkey {
    pub id: i64,
    pub name: String,
    pub key_content: String,
    pub passphrase: Option<String>,
    pub key_type: Option<KeyType>,
    pub fingerprint: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl DbEntity for Passkey {
    fn table_name() -> &'static str {
        "passkeys"
    }

    /// `key_content` y `passphrase` se cifran siempre.
    /// `expose = false`: el frontend no los necesita en texto plano;
    /// Rust los usa internamente para establecer conexiones SSH.
    fn encrypted_fields() -> &'static [(&'static str, bool)] {
        &[("key_content", false), ("passphrase", false)]
    }

    fn from_row(row: &sqlx::sqlite::SqliteRow) -> Result<Self, String> {
        Ok(Passkey {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            name: row.try_get("name").map_err(|e| e.to_string())?,
            key_content: row.try_get("key_content").map_err(|e| e.to_string())?,
            passphrase: row.try_get("passphrase").map_err(|e| e.to_string())?,
            key_type: row
                .try_get::<Option<String>, _>("key_type")
                .map_err(|e| e.to_string())?
                .as_deref()
                .map(|s| s.parse())
                .transpose()?,
            fingerprint: row.try_get("fingerprint").map_err(|e| e.to_string())?,
            description: row.try_get("description").map_err(|e| e.to_string())?,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        })
    }

    fn to_fields(&self) -> Vec<(String, Value)> {
        vec![
            ("name".into(), Value::String(self.name.clone())),
            ("key_content".into(), Value::String(self.key_content.clone())),
            (
                "passphrase".into(),
                self.passphrase
                    .as_ref()
                    .map(|v| Value::String(v.clone()))
                    .unwrap_or(Value::Null),
            ),
            (
                "key_type".into(),
                self.key_type
                    .as_ref()
                    .map(|v| Value::String(v.to_string()))
                    .unwrap_or(Value::Null),
            ),
            (
                "fingerprint".into(),
                self.fingerprint
                    .as_ref()
                    .map(|v| Value::String(v.clone()))
                    .unwrap_or(Value::Null),
            ),
            (
                "description".into(),
                self.description
                    .as_ref()
                    .map(|v| Value::String(v.clone()))
                    .unwrap_or(Value::Null),
            ),
        ]
    }

    fn to_fields_all(&self) -> Vec<(String, Value)> {
        let mut fields = vec![
            ("id".into(), Value::Number(self.id.into())),
            ("created_at".into(), Value::String(self.created_at.clone())),
            ("updated_at".into(), Value::String(self.updated_at.clone())),
        ];
        fields.extend(self.to_fields());
        fields
    }

    fn from_fields(fields: Vec<(String, Value)>) -> Result<Self, String> {
        let map: std::collections::HashMap<String, Value> = fields.into_iter().collect();

        let key_type = map
            .get("key_type")
            .and_then(|v| v.as_str())
            .map(|s| s.parse::<KeyType>())
            .transpose()?;

        Ok(Passkey {
            id: map.get("id").and_then(|v| v.as_i64()).unwrap_or(0),
            name: map
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            key_content: map
                .get("key_content")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            passphrase: map
                .get("passphrase")
                .and_then(|v| v.as_str())
                .map(str::to_string),
            key_type,
            fingerprint: map
                .get("fingerprint")
                .and_then(|v| v.as_str())
                .map(str::to_string),
            description: map
                .get("description")
                .and_then(|v| v.as_str())
                .map(str::to_string),
            created_at: map
                .get("created_at")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            updated_at: map
                .get("updated_at")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
        })
    }
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
