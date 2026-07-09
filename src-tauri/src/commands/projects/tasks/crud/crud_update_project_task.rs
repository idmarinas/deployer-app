use std::collections::HashMap;
use serde_json::Value;
use tauri::AppHandle;

use crate::commands::projects::tasks::helpers::open_crypto_context;
use crate::commands::projects::tasks::types::{ProjectTask, UpdateProjectTaskInput};
use crate::commands::CommandResponse;
use crate::db::{self};

/// Actualiza los campos mutables de una asociación proyecto-tarea.
#[tauri::command]
pub async fn crud_update_project_task(
    app: AppHandle,
    id: i64,
    input: UpdateProjectTaskInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_tasks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut fields: Vec<(String, Value)> = Vec::new();

    if let Some(order_execution) = input.order_execution {
        fields.push(("order_execution".to_string(), Value::from(order_execution)));
    }
    if let Some(enabled) = input.enabled {
        fields.push(("enabled".to_string(), Value::Bool(enabled)));
    }
    if let Some(on_failure) = input.on_failure {
        fields.push((
            "on_failure".to_string(),
            serde_json::to_value(on_failure).unwrap_or(Value::Null),
        ));
    }
    if let Some(v) = input.condition.to_field_value() {
        fields.push(("condition".to_string(), v));
    }
    if let Some(v) = input.config.to_field_value() {
        fields.push(("config".to_string(), v));
    }
    if let Some(v) = input.local_working_dir.to_field_value() {
        fields.push(("local_working_dir".to_string(), v));
    }
    if let Some(v) = input.remote_working_dir.to_field_value() {
        fields.push(("remote_working_dir".to_string(), v));
    }
    if let Some(v) = input.retry_count.to_field_value() {
        fields.push(("retry_count".to_string(), v));
    }
    if let Some(v) = input.retry_delay.to_field_value() {
        fields.push(("retry_delay".to_string(), v));
    }

    match db::update_fields::<ProjectTask>(&pool, id, fields, &key).await {
        Ok(true) => Ok(CommandResponse::ok_empty("project_tasks.success.updated")),
        Ok(false) => Ok(CommandResponse::err(
            "project_tasks.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("project_tasks", "update_failed", e)),
    }
}