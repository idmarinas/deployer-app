use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::hosts::helpers::open_crypto_context;
use crate::commands::hosts::types::{CreateHostInput, Host};
use crate::commands::CommandResponse;
use crate::db::{self};

/// Crea un nuevo host cifrando los campos sensibles de forma transparente.
#[tauri::command]
pub async fn crud_create_host(
    app: AppHandle,
    input: CreateHostInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "hosts.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let host = input.into_host();

    match db::insert::<Host>(&pool, &host, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "hosts.success.created")),
        Err(e) => Ok(db::error_to_response("hosts", "create_failed", e)),
    }
}