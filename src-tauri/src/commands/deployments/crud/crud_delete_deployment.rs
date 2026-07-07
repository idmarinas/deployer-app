use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::deployments::helpers::open_crypto_context;
use crate::commands::deployments::types::Deployment;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Elimina un deployment por su `id` (en cascada elimina executions y rollbacks).
#[tauri::command]
pub async fn crud_delete_deployment(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<()>, String> {
    let (pool, _, _) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployments.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::delete(&pool, Deployment::table_name(), id).await {
        Ok(true) => Ok(CommandResponse::ok_empty("deployments.success.deleted")),
        Ok(false) => Ok(CommandResponse::err(
            "deployments.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("deployments", "delete_failed", e)),
    }
}
