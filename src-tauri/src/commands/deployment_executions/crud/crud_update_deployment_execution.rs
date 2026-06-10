use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::deployment_executions::helpers::open_crypto_context;
use crate::commands::deployment_executions::types::{
    DeploymentExecution, UpdateDeploymentExecutionInput,
};
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Actualiza el estado y campos de ciclo de vida de una ejecución.
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

    let current = match db::fetch_one::<DeploymentExecution>(&pool, id, cache, &key).await {
        Ok(Some(e)) => e,
        Ok(None) => {
            return Ok(CommandResponse::err(
                "deployment_executions.errors.not_found",
                HashMap::from([("id".to_string(), id.to_string())]),
            ))
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_executions.errors.fetch_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let new_status = input.status.unwrap_or(current.status);
    let new_exit_code = input.exit_code.or(current.exit_code);
    let new_output = input.output.or(current.output);
    let new_error = input.error_message.or(current.error_message);
    let new_started_at = input.started_at.or(current.started_at);
    let new_finished_at = input.finished_at.or(current.finished_at);
    let new_duration = input.duration_seconds.or(current.duration_seconds);
    let new_retry = input.retry_attempt.unwrap_or(current.retry_attempt);

    // deployment_executions no tiene updated_at: query manual.
    let sql = format!(
        "UPDATE {} SET status = ?1, exit_code = ?2, output = ?3, error_message = ?4,
         started_at = ?5, finished_at = ?6, duration_seconds = ?7, retry_attempt = ?8
         WHERE id = ?9",
        DeploymentExecution::table_name()
    );

    match sqlx::query(&sql)
        .bind(new_status.to_string())
        .bind(new_exit_code)
        .bind(new_output)
        .bind(new_error)
        .bind(new_started_at)
        .bind(new_finished_at)
        .bind(new_duration)
        .bind(new_retry)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Error al actualizar deployment_execution {}: {}", id, e))
    {
        Ok(_) => Ok(CommandResponse::ok_empty("deployment_executions.success.updated")),
        Err(e) => Ok(CommandResponse::err(
            "deployment_executions.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
