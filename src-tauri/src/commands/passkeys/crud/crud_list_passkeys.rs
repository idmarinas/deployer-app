use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::passkeys::helpers::open_crypto_context;
use crate::commands::passkeys::types::Passkey;
use crate::commands::CommandResponse;
use crate::db::{self};

/// Lista todas las passkeys.
/// Los campos con `expose = true` se devuelven descifrados.
/// Por defecto `key_content` y `passphrase` tienen `expose = false`
/// y se devuelven cifrados al frontend.
#[tauri::command]
pub async fn crud_list_passkeys(
    app: AppHandle,
) -> Result<CommandResponse<Vec<Passkey>>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "passkeys.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_all_frontend::<Passkey>(&pool, &key).await {
        Ok(passkeys) => Ok(CommandResponse::ok(passkeys, "passkeys.success.listed")),
        Err(e) => Ok(db::error_to_response("passkeys", "list_failed", e)),
    }
}