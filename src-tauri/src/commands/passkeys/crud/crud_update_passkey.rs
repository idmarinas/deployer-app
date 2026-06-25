use std::collections::HashMap;
use serde_json::Value;
use tauri::AppHandle;
use tauri::State;

use crate::commands::passkeys::helpers::open_crypto_context;
use crate::commands::passkeys::types::{Passkey, UpdatePasskeyInput};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Actualiza una passkey existente por su `id`.
///
/// `passphrase`, `key_type`, `fingerprint` y `description` son `Patch<T>`:
/// omitir la clave no la toca, `null` la borra, un valor la actualiza. El
/// cifrado de `passphrase` lo aplica `db::update_fields` automáticamente.
#[tauri::command]
pub async fn crud_update_passkey(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdatePasskeyInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "passkeys.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut fields: Vec<(String, Value)> = Vec::new();

    if let Some(name) = input.name {
        fields.push(("name".to_string(), Value::String(name)));
    }
    if let Some(key_content) = input.key_content {
        fields.push(("key_content".to_string(), Value::String(key_content)));
    }
    if let Some(v) = input.passphrase.to_field_value() {
        fields.push(("passphrase".to_string(), v));
    }
    if let Some(v) = input.key_type.to_field_value() {
        fields.push(("key_type".to_string(), v));
    }
    if let Some(v) = input.fingerprint.to_field_value() {
        fields.push(("fingerprint".to_string(), v));
    }
    if let Some(v) = input.description.to_field_value() {
        fields.push(("description".to_string(), v));
    }

    match db::update_fields::<Passkey>(&pool, id, fields, cache, &key).await {
        Ok(true) => Ok(CommandResponse::ok_empty("passkeys.success.updated")),
        Ok(false) => Ok(CommandResponse::err(
            "passkeys.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "passkeys.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
