use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::deployments::rollbacks::helpers::open_crypto_context;
use crate::commands::deployments::rollbacks::types::{
    DeploymentRollback, UpdateDeploymentRollbackInput,
};
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Actualiza el estado y campos de ciclo de vida de un rollback.
#[tauri::command]
pub async fn crud_update_deployment_rollback(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdateDeploymentRollbackInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_rollbacks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let current = match db::fetch_one::<DeploymentRollback>(&pool, id, cache, &key).await {
        Ok(Some(r)) => r,
        Ok(None) => {
            return Ok(CommandResponse::err(
                "deployment_rollbacks.errors.not_found",
                HashMap::from([("id".to_string(), id.to_string())]),
            ))
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_rollbacks.errors.fetch_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let new_status = input.status.unwrap_or(current.status);
    let new_started_at = input.started_at.or(current.started_at);
    let new_finished_at = input.finished_at.or(current.finished_at);

    // deployment_rollbacks no tiene updated_at: query manual.
    let sql = format!(
        "UPDATE {} SET status = ?1, started_at = ?2, finished_at = ?3 WHERE id = ?4",
        DeploymentRollback::table_name()
    );

    match sqlx::query(&sql)
        .bind(new_status.to_string())
        .bind(new_started_at)
        .bind(new_finished_at)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Error al actualizar deployment_rollback {}: {}", id, e))
    {
        Ok(_) => Ok(CommandResponse::ok_empty("deployment_rollbacks.success.updated")),
        Err(e) => Ok(CommandResponse::err(
            "deployment_rollbacks.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
