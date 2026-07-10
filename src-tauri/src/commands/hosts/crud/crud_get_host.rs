use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::hosts::helpers::open_crypto_context;
use crate::commands::hosts::types::Host;
use crate::commands::CommandResponse;
use crate::db::{self};

/// Obtiene un host por su `id`.
/// Los campos con `expose = true` se devuelven descifrados.
#[tauri::command]
pub async fn crud_get_host(
    app: AppHandle,
    id: i64,
) -> Result<CommandResponse<Host>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "hosts.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one_frontend::<Host>(&pool, id, &key).await {
        Ok(Some(host)) => Ok(CommandResponse::ok(host, "hosts.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "hosts.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("hosts", "fetch_failed", e)),
    }
}