use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::hosts::helpers::open_crypto_context;
use crate::commands::hosts::types::Host;
use crate::commands::CommandResponse;
use crate::db::{self};

/// Lista todos los hosts.
/// Los campos con `expose = true` se devuelven descifrados.
#[tauri::command]
pub async fn crud_list_hosts(
    app: AppHandle,
) -> Result<CommandResponse<Vec<Host>>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "hosts.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_all::<Host>(&pool, &key).await {
        Ok(hosts) => Ok(CommandResponse::ok(hosts, "hosts.success.listed")),
        Err(e) => Ok(db::error_to_response("hosts", "list_failed", e)),
    }
}