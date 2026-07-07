use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::deployments::rollbacks::helpers::open_crypto_context;
use crate::commands::deployments::rollbacks::types::{
    CreateDeploymentRollbackInput, DeploymentRollback,
};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Crea un nuevo registro de rollback en estado `pending`.
#[tauri::command]
pub async fn crud_create_deployment_rollback(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    input: CreateDeploymentRollbackInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_rollbacks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let rollback = input.into_deployment_rollback();

    match db::insert::<DeploymentRollback>(&pool, &rollback, cache, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "deployment_rollbacks.success.created")),
        Err(e) => Ok(db::error_to_response("deployment_rollbacks", "create_failed", e)),
    }
}
