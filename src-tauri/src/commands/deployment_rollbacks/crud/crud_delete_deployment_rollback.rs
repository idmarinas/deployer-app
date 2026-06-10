use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::deployment_rollbacks::helpers::open_crypto_context;
use crate::commands::deployment_rollbacks::types::DeploymentRollback;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Elimina un rollback por su `id`.
#[tauri::command]
pub async fn crud_delete_deployment_rollback(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<()>, String> {
    let (pool, _, _) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_rollbacks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::delete(&pool, DeploymentRollback::table_name(), id).await {
        Ok(true) => Ok(CommandResponse::ok_empty("deployment_rollbacks.success.deleted")),
        Ok(false) => Ok(CommandResponse::err(
            "deployment_rollbacks.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "deployment_rollbacks.errors.delete_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
