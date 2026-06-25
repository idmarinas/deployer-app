use std::collections::HashMap;
use serde_json::Value;
use tauri::AppHandle;
use tauri::State;

use crate::commands::deployments::executions::helpers::open_crypto_context;
use crate::commands::deployments::executions::types::{
    DeploymentExecution, UpdateDeploymentExecutionInput,
};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Actualiza el estado y campos de ciclo de vida de una ejecución.
///
/// `deployment_executions` no tiene columna `updated_at`, así que esa tabla no
/// tiene trigger de auto-actualización; `db::update_fields` funciona igual.
#[tauri::command]
pub async fn crud_update_deployment_execution(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdateDeploymentExecutionInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_executions.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut fields: Vec<(String, Value)> = Vec::new();

    if let Some(status) = input.status {
        fields.push((
            "status".to_string(),
            serde_json::to_value(status).unwrap_or(Value::Null),
        ));
    }
    if let Some(retry_attempt) = input.retry_attempt {
        fields.push(("retry_attempt".to_string(), Value::from(retry_attempt)));
    }
    if let Some(v) = input.exit_code.to_field_value() {
        fields.push(("exit_code".to_string(), v));
    }
    if let Some(v) = input.output.to_field_value() {
        fields.push(("output".to_string(), v));
    }
    if let Some(v) = input.error_message.to_field_value() {
        fields.push(("error_message".to_string(), v));
    }
    if let Some(v) = input.started_at.to_field_value() {
        fields.push(("started_at".to_string(), v));
    }
    if let Some(v) = input.finished_at.to_field_value() {
        fields.push(("finished_at".to_string(), v));
    }
    if let Some(v) = input.duration_seconds.to_field_value() {
        fields.push(("duration_seconds".to_string(), v));
    }

    match db::update_fields::<DeploymentExecution>(&pool, id, fields, cache, &key)
        .await
    {
        Ok(true) => Ok(CommandResponse::ok_empty(
            "deployment_executions.success.updated",
        )),
        Ok(false) => Ok(CommandResponse::err(
            "deployment_executions.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "deployment_executions.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
