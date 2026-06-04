use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::passkeys::helpers::open_crypto_context;
use crate::commands::passkeys::types::{Passkey, UpdatePasskeyInput};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Actualiza una passkey existente por su `id`.
///
/// Solo se actualizan los campos presentes en `UpdatePasskeyInput`.
/// Si `key_content` o `passphrase` son `None`, se conservan los valores actuales
/// (ya cifrados en BD) sin volver a cifrarlos.
#[tauri::command]
pub async fn crud_update_passkey(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdatePasskeyInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "passkeys.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    // Obtener la passkey actual para fusionar con los cambios
    let current = match db::fetch_one::<Passkey>(&pool, id, cache, &key).await {
        Ok(Some(p)) => p,
        Ok(None) => {
            return Ok(CommandResponse::err(
                "passkeys.errors.not_found",
                HashMap::from([("id".to_string(), id.to_string())]),
            ))
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "passkeys.errors.fetch_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let updated = Passkey {
        id: current.id,
        name: input.name.unwrap_or(current.name),
        key_content: input.key_content.unwrap_or(current.key_content),
        passphrase: input.passphrase.or(current.passphrase),
        key_type: input.key_type.or(current.key_type),
        fingerprint: input.fingerprint.or(current.fingerprint),
        description: input.description.or(current.description),
        created_at: current.created_at,
        updated_at: current.updated_at,
    };

    match db::update::<Passkey>(&pool, id, &updated, cache, &key).await {
        Ok(()) => Ok(CommandResponse::ok_empty("passkeys.success.updated")),
        Err(e) => Ok(CommandResponse::err(
            "passkeys.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
