use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::deployments::helpers::open_crypto_context;
use crate::commands::deployments::types::Deployment;
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Obtiene un deployment por su `id`.
#[tauri::command]
pub async fn crud_get_deployment(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<Deployment>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployments.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one::<Deployment>(&pool, id, cache, &key).await {
        Ok(Some(d)) => Ok(CommandResponse::ok(d, "deployments.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "deployments.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("deployments", "fetch_failed", e)),
    }
}
