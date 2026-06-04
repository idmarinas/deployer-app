use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::passkeys::helpers::open_crypto_context;
use crate::commands::passkeys::types::Passkey;
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Lista todas las passkeys.
/// Los campos con `expose = true` se devuelven descifrados.
/// Por defecto `key_content` y `passphrase` tienen `expose = false`
/// y se devuelven cifrados al frontend.
#[tauri::command]
pub async fn crud_list_passkeys(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
) -> Result<CommandResponse<Vec<Passkey>>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "passkeys.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_all::<Passkey>(&pool, cache, &key).await {
        Ok(passkeys) => Ok(CommandResponse::ok(passkeys, "passkeys.success.listed")),
        Err(e) => Ok(CommandResponse::err(
            "passkeys.errors.list_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
