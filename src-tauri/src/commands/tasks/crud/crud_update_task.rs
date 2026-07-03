use std::collections::HashMap;
use serde_json::Value;
use tauri::AppHandle;
use tauri::State;

use crate::commands::tasks::helpers::open_crypto_context;
use crate::commands::tasks::types::{Task, UpdateTaskInput};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Actualiza una tarea existente por su `id`.
#[tauri::command]
pub async fn crud_update_task(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdateTaskInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tasks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut fields: Vec<(String, Value)> = Vec::new();

    if let Some(name) = input.name {
        fields.push(("name".to_string(), Value::String(name)));
    }
    if let Some(task_type) = input.task_type {
        fields.push((
            "type".to_string(),
            serde_json::to_value(task_type).unwrap_or(Value::Null),
        ));
    }
    if let Some(timeout) = input.timeout {
        fields.push(("timeout".to_string(), Value::from(timeout)));
    }
    if let Some(retry_count) = input.retry_count {
        fields.push(("retry_count".to_string(), Value::from(retry_count)));
    }
    if let Some(retry_delay) = input.retry_delay {
        fields.push(("retry_delay".to_string(), Value::from(retry_delay)));
    }
    if let Some(enabled) = input.enabled {
        fields.push(("enabled".to_string(), Value::Bool(enabled)));
    }
    if let Some(is_global) = input.is_global {
        fields.push(("is_global".to_string(), Value::Bool(is_global)));
    }
    if let Some(v) = input.description.to_field_value() {
        fields.push(("description".to_string(), v));
    }
    if let Some(v) = input.command.to_field_value() {
        fields.push(("command".to_string(), v));
    }

    match db::update_fields::<Task>(&pool, id, fields, cache, &key).await {
        Ok(true) => Ok(CommandResponse::ok_empty("tasks.success.updated")),
        Ok(false) => Ok(CommandResponse::err(
            "tasks.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "tasks.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
