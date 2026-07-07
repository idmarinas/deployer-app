use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::deployments::rollbacks::helpers::open_crypto_context;
use crate::commands::deployments::rollbacks::types::DeploymentRollback;
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Obtiene un rollback por su `id`.
#[tauri::command]
pub async fn crud_get_deployment_rollback(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<DeploymentRollback>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_rollbacks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one::<DeploymentRollback>(&pool, id, cache, &key).await {
        Ok(Some(r)) => Ok(CommandResponse::ok(r, "deployment_rollbacks.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "deployment_rollbacks.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("deployment_rollbacks", "fetch_failed", e)),
    }
}
