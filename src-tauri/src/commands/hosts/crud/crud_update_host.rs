use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::hosts::helpers::open_crypto_context;
use crate::commands::hosts::types::{Host, UpdateHostInput};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Actualiza un host existente por su `id`.
///
/// Solo se actualizan los campos presentes en `UpdateHostInput`.
/// Si `password` es `None`, la contraseña actual no se modifica.
/// Si `password` ya tiene el prefijo `ENC:`, no se vuelve a cifrar.
#[tauri::command]
pub async fn crud_update_host(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdateHostInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "hosts.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    // Obtener el host actual para fusionar con los cambios
    let current = match db::fetch_one::<Host>(&pool, id, cache, &key).await {
        Ok(Some(h)) => h,
        Ok(None) => {
            return Ok(CommandResponse::err(
                "hosts.errors.not_found",
                HashMap::from([("id".to_string(), id.to_string())]),
            ))
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "hosts.errors.fetch_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    // Fusionar: usar el valor del input si está presente, o mantener el actual
    let updated = Host {
        id: current.id,
        name: input.name.unwrap_or(current.name),
        host: input.host.unwrap_or(current.host),
        port: input.port.unwrap_or(current.port),
        username: input.username.unwrap_or(current.username),
        auth_type: input.auth_type.unwrap_or(current.auth_type),
        // Si password es None en el input, conservar la actual (ya cifrada en BD)
        password: input.password.or(current.password),
        key_id: input.key_id.or(current.key_id),
        description: input.description.or(current.description),
        enabled: input.enabled.unwrap_or(current.enabled),
        created_at: current.created_at,
        updated_at: current.updated_at,
    };

    match db::update::<Host>(&pool, id, &updated, cache, &key).await {
        Ok(()) => Ok(CommandResponse::ok_empty("hosts.success.updated")),
        Err(e) => Ok(CommandResponse::err(
            "hosts.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
