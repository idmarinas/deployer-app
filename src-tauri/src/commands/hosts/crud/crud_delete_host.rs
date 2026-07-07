use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::hosts::helpers::open_crypto_context;
use crate::commands::hosts::types::Host;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Elimina un host por su `id`.
/// Devuelve error si el host no existe.
#[tauri::command]
pub async fn crud_delete_host(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<()>, String> {
    // Solo necesitamos el pool para delete (no hay cifrado implicado)
    let (pool, _, _) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "hosts.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::delete(&pool, Host::table_name(), id).await {
        Ok(true) => Ok(CommandResponse::ok_empty("hosts.success.deleted")),
        Ok(false) => Ok(CommandResponse::err(
            "hosts.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("hosts", "delete_failed", e)),
    }
}
