use std::collections::HashMap;
use serde_json::Value;
use tauri::AppHandle;
use tauri::State;

use crate::commands::projects::helpers::open_crypto_context;
use crate::commands::projects::types::{Project, UpdateProjectInput};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Actualiza un proyecto existente por su `id`.
///
/// Solo se incluyen en el `UPDATE` los campos presentes en `input`: las claves
/// ausentes no se tocan, y los campos `NULL`-ables (modelados como `Patch<T>`)
/// pueden borrarse explícitamente enviando `null`. No requiere `fetch_one`
/// previo: el `UPDATE` dinámico se construye directamente desde `input`.
#[tauri::command]
pub async fn crud_update_project(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdateProjectInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "projects.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut fields: Vec<(String, Value)> = Vec::new();

    if let Some(name) = input.name {
        fields.push(("name".to_string(), Value::String(name)));
    }
    if let Some(framework) = input.framework {
        fields.push(("framework".to_string(), Value::String(framework)));
    }
    if let Some(enabled) = input.enabled {
        fields.push(("enabled".to_string(), Value::Bool(enabled)));
    }
    if let Some(v) = input.description.to_field_value() {
        fields.push(("description".to_string(), v));
    }
    if let Some(v) = input.git_url.to_field_value() {
        fields.push(("git_url".to_string(), v));
    }
    if let Some(v) = input.local_working_dir.to_field_value() {
        fields.push(("local_working_dir".to_string(), v));
    }
    if let Some(v) = input.remote_working_dir.to_field_value() {
        fields.push(("remote_working_dir".to_string(), v));
    }

    match db::update_fields::<Project>(&pool, id, fields, cache, &key).await {
        Ok(true) => Ok(CommandResponse::ok_empty("projects.success.updated")),
        Ok(false) => Ok(CommandResponse::err(
            "projects.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("projects", "update_failed", e)),
    }
}
