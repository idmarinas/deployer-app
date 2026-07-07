use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::tasks::helpers::open_crypto_context;
use crate::commands::tasks::types::{CreateTaskInput, Task};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Crea una nueva tarea.
#[tauri::command]
pub async fn crud_create_task(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    input: CreateTaskInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tasks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let task = input.into_task();

    match db::insert::<Task>(&pool, &task, cache, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "tasks.success.created")),
        Err(e) => Ok(db::error_to_response("tasks", "create_failed", e)),
    }
}
