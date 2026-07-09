use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::deployments::executions::helpers::open_crypto_context;
use crate::commands::deployments::executions::types::DeploymentExecution;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity};

/// Elimina una ejecución de deployment por su `id`.
#[tauri::command]
pub async fn crud_delete_deployment_execution(
    app: AppHandle,
    id: i64,
) -> Result<CommandResponse<()>, String> {
    let (pool, _) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_executions.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::delete(&pool, DeploymentExecution::table_name(), id).await {
        Ok(true) => Ok(CommandResponse::ok_empty("deployment_executions.success.deleted")),
        Ok(false) => Ok(CommandResponse::err(
            "deployment_executions.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("deployment_executions", "delete_failed", e)),
    }
}