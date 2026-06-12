use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::tasks::helpers::open_crypto_context;
use crate::commands::tasks::types::{Task, UpdateTaskInput};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Actualiza una tarea existente por su `id`.
#[tauri::command]
pub async fn crud_update_task(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdateTaskInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tasks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let current = match db::fetch_one::<Task>(&pool, id, cache, &key).await {
        Ok(Some(t)) => t,
        Ok(None) => {
            return Ok(CommandResponse::err(
                "tasks.errors.not_found",
                HashMap::from([("id".to_string(), id.to_string())]),
            ))
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "tasks.errors.fetch_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let updated = Task {
        id: current.id,
        name: input.name.unwrap_or(current.name),
        description: input.description.or(current.description),
        task_type: input.task_type.unwrap_or(current.task_type),
        command: input.command.or(current.command),
        timeout: input.timeout.unwrap_or(current.timeout),
        retry_count: input.retry_count.unwrap_or(current.retry_count),
        retry_delay: input.retry_delay.unwrap_or(current.retry_delay),
        enabled: input.enabled.unwrap_or(current.enabled),
        is_global: input.is_global.unwrap_or(current.is_global),
        created_at: current.created_at,
        updated_at: current.updated_at,
    };

    match db::update::<Task>(&pool, id, &updated, cache, &key).await {
        Ok(()) => Ok(CommandResponse::ok_empty("tasks.success.updated")),
        Err(e) => Ok(CommandResponse::err(
            "tasks.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
