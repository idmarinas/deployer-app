use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::deployments::executions::helpers::open_crypto_context;
use crate::commands::deployments::executions::types::DeploymentExecution;
use crate::commands::CommandResponse;
use crate::db::{self};

/// Obtiene una ejecución de deployment por su `id`.
#[tauri::command]
pub async fn crud_get_deployment_execution(
    app: AppHandle,
    id: i64,
) -> Result<CommandResponse<DeploymentExecution>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_executions.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one::<DeploymentExecution>(&pool, id, &key).await {
        Ok(Some(e)) => Ok(CommandResponse::ok(e, "deployment_executions.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "deployment_executions.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("deployment_executions", "fetch_failed", e)),
    }
}