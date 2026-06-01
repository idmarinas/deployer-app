use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::Row;
use ts_rs::TS;

use crate::db::DbEntity;

// ============================================================================
// Entidad Host
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct Host {
    pub id: i64,
    pub name: String,
    pub host: String,
    pub port: i64,
    pub username: Option<String>,
    pub auth_type: String,
    pub password: Option<String>,
    pub key_id: Option<i64>,
    pub description: Option<String>,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl DbEntity for Host {
    fn table_name() -> &'static str {
        "hosts"
    }

    /// `password` se cifra siempre. `expose = false` (el frontend no necesita
    /// leerla en texto plano; solo la usa Rust internamente para SSH).
    fn encrypted_fields() -> &'static [(&'static str, bool)] {
        &[("password", false)]
    }

    fn from_row(row: &sqlx::sqlite::SqliteRow) -> Result<Self, String> {
        Ok(Host {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            name: row.try_get("name").map_err(|e| e.to_string())?,
            host: row.try_get("host").map_err(|e| e.to_string())?,
            port: row.try_get("port").map_err(|e| e.to_string())?,
            username: row.try_get("username").map_err(|e| e.to_string())?,
            auth_type: row.try_get("auth_type").map_err(|e| e.to_string())?,
            password: row.try_get("password").map_err(|e| e.to_string())?,
            key_id: row.try_get("key_id").map_err(|e| e.to_string())?,
            description: row.try_get("description").map_err(|e| e.to_string())?,
            enabled: row.try_get("enabled").map_err(|e| e.to_string())?,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        })
    }

    fn to_fields(&self) -> Vec<(String, Value)> {
        vec![
            ("name".into(), Value::String(self.name.clone())),
            ("host".into(), Value::String(self.host.clone())),
            ("port".into(), Value::Number(self.port.into())),
            ("username".into(), self.username.as_ref().map(|v| Value::String(v.clone())).unwrap_or(Value::Null)),
            ("auth_type".into(), Value::String(self.auth_type.clone())),
            ("password".into(), self.password.as_ref().map(|v| Value::String(v.clone())).unwrap_or(Value::Null)),
            ("key_id".into(), self.key_id.map(Value::from).unwrap_or(Value::Null)),
            ("description".into(), self.description.as_ref().map(|v| Value::String(v.clone())).unwrap_or(Value::Null)),
            ("enabled".into(), Value::Bool(self.enabled)),
        ]
    }

    fn from_fields(fields: Vec<(String, Value)>) -> Result<Self, String> {
        let map: std::collections::HashMap<String, Value> = fields.into_iter().collect();

        // from_fields se usa solo para actualizar campos descifrados,
        // por lo que id, created_at y updated_at pueden no estar presentes.
        // Se usan valores por defecto seguros para esos campos.
        Ok(Host {
            id: map.get("id").and_then(|v| v.as_i64()).unwrap_or(0),
            name: map.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            host: map.get("host").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            port: map.get("port").and_then(|v| v.as_i64()).unwrap_or(22),
            username: map.get("username").and_then(|v| v.as_str()).map(str::to_string),
            auth_type: map.get("auth_type").and_then(|v| v.as_str()).unwrap_or("password").to_string(),
            password: map.get("password").and_then(|v| v.as_str()).map(str::to_string),
            key_id: map.get("key_id").and_then(|v| v.as_i64()),
            description: map.get("description").and_then(|v| v.as_str()).map(str::to_string),
            enabled: map.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true),
            created_at: map.get("created_at").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            updated_at: map.get("updated_at").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        })
    }
}

// ============================================================================
// Input para crear un Host
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreateHostInput {
    pub name: String,
    pub host: String,
    pub port: Option<i64>,
    pub username: Option<String>,
    pub auth_type: String,
    pub password: Option<String>,
    pub key_id: Option<i64>,
    pub description: Option<String>,
    pub enabled: Option<bool>,
}

impl CreateHostInput {
    /// Convierte el input en una entidad `Host` lista para insertar.
    /// Los campos `id`, `created_at` y `updated_at` se gestionan por SQLite.
    pub fn into_host(self) -> Host {
        Host {
            id: 0,
            name: self.name,
            host: self.host,
            port: self.port.unwrap_or(22),
            username: self.username,
            auth_type: self.auth_type,
            password: self.password,
            key_id: self.key_id,
            description: self.description,
            enabled: self.enabled.unwrap_or(true),
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

// ============================================================================
// Input para actualizar un Host
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateHostInput {
    pub name: Option<String>,
    pub host: Option<String>,
    pub port: Option<i64>,
    pub username: Option<String>,
    pub auth_type: Option<String>,
    /// Si es `None`, no se modifica la contraseña actual.
    /// Si es `Some("")`, se elimina la contraseña.
    /// Si es `Some("valor")`, se cifra y se guarda.
    pub password: Option<String>,
    pub key_id: Option<i64>,
    pub description: Option<String>,
    pub enabled: Option<bool>,
}
