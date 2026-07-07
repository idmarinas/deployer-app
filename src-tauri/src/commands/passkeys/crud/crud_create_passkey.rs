use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::passkeys::helpers::open_crypto_context;
use crate::commands::passkeys::types::{CreatePasskeyInput, Passkey};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Crea una nueva passkey cifrando `key_content` y `passphrase` de forma transparente.
#[tauri::command]
pub async fn crud_create_passkey(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    input: CreatePasskeyInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "passkeys.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let passkey = input.into_passkey();

    match db::insert::<Passkey>(&pool, &passkey, cache, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "passkeys.success.created")),
        Err(e) => Ok(db::error_to_response("passkeys", "create_failed", e)),
    }
}
