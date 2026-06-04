use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::passkeys::helpers::open_crypto_context;
use crate::commands::passkeys::types::Passkey;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Elimina una passkey por su `id`.
/// Devuelve error si la passkey no existe.
///
/// Nota: si algún host tiene `key_id` apuntando a esta passkey,
/// SQLite lo pondrá a NULL automáticamente (ON DELETE SET NULL).
#[tauri::command]
pub async fn crud_delete_passkey(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<()>, String> {
    let (pool, _, _) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "passkeys.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::delete(&pool, Passkey::table_name(), id).await {
        Ok(true) => Ok(CommandResponse::ok_empty("passkeys.success.deleted")),
        Ok(false) => Ok(CommandResponse::err(
            "passkeys.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "passkeys.errors.delete_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
