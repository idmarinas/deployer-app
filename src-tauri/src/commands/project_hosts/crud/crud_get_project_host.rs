use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::project_hosts::helpers::open_crypto_context;
use crate::commands::project_hosts::types::ProjectHost;
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Obtiene la asociación proyecto-host por su `id`.
#[tauri::command]
pub async fn crud_get_project_host(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<ProjectHost>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_hosts.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one::<ProjectHost>(&pool, id, cache, &key).await {
        Ok(Some(ph)) => Ok(CommandResponse::ok(ph, "project_hosts.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "project_hosts.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "project_hosts.errors.fetch_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
