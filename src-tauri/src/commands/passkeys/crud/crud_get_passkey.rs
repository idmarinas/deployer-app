use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::passkeys::helpers::open_crypto_context;
use crate::commands::passkeys::types::Passkey;
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Obtiene una passkey por su `id`.
/// Los campos con `expose = true` se devuelven descifrados.
/// Por defecto `key_content` y `passphrase` tienen `expose = false`
/// y se devuelven cifrados al frontend.
#[tauri::command]
pub async fn crud_get_passkey(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<Passkey>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "passkeys.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one::<Passkey>(&pool, id, cache, &key).await {
        Ok(Some(passkey)) => Ok(CommandResponse::ok(passkey, "passkeys.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "passkeys.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("passkeys", "fetch_failed", e)),
    }
}
