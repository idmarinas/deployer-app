use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::hosts::helpers::open_crypto_context;
use crate::commands::hosts::types::Host;
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Obtiene un host por su `id`.
/// Los campos con `expose = true` se devuelven descifrados.
#[tauri::command]
pub async fn crud_get_host(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<Host>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "hosts.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one::<Host>(&pool, id, cache, &key).await {
        Ok(Some(host)) => Ok(CommandResponse::ok(host, "hosts.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "hosts.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "hosts.errors.fetch_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
