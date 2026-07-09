use std::collections::HashMap;
use serde_json::Value;
use tauri::AppHandle;

use crate::commands::hosts::helpers::open_crypto_context;
use crate::commands::hosts::types::{Host, UpdateHostInput};
use crate::commands::CommandResponse;
use crate::db::{self};

/// Actualiza un host existente por su `id`.
///
/// Solo se incluyen en el `UPDATE` los campos presentes en `input`. `password`,
/// `key_id` y `description` son `Patch<T>`: omitir la clave no la toca, `null`
/// la borra, un valor la actualiza. El cifrado de `password` lo aplica
/// `db::update_fields` automáticamente (vía `Host::encrypted_fields()`).
#[tauri::command]
pub async fn crud_update_host(
    app: AppHandle,
    id: i64,
    input: UpdateHostInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "hosts.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut fields: Vec<(String, Value)> = Vec::new();

    if let Some(name) = input.name {
        fields.push(("name".to_string(), Value::String(name)));
    }
    if let Some(host) = input.host {
        fields.push(("host".to_string(), Value::String(host)));
    }
    if let Some(port) = input.port {
        fields.push(("port".to_string(), Value::from(port)));
    }
    if let Some(username) = input.username {
        fields.push(("username".to_string(), Value::String(username)));
    }
    if let Some(auth_type) = input.auth_type {
        fields.push((
            "auth_type".to_string(),
            serde_json::to_value(auth_type).unwrap_or(Value::Null),
        ));
    }
    if let Some(enabled) = input.enabled {
        fields.push(("enabled".to_string(), Value::Bool(enabled)));
    }
    if let Some(v) = input.password.to_field_value() {
        fields.push(("password".to_string(), v));
    }
    if let Some(v) = input.key_id.to_field_value() {
        fields.push(("key_id".to_string(), v));
    }
    if let Some(v) = input.description.to_field_value() {
        fields.push(("description".to_string(), v));
    }

    match db::update_fields::<Host>(&pool, id, fields, &key).await {
        Ok(true) => Ok(CommandResponse::ok_empty("hosts.success.updated")),
        Ok(false) => Ok(CommandResponse::err(
            "hosts.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("hosts", "update_failed", e)),
    }
}