use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::tasks::helpers::open_crypto_context;
use crate::commands::tasks::types::Task;
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Lista todas las tareas.
#[tauri::command]
pub async fn crud_list_tasks(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
) -> Result<CommandResponse<Vec<Task>>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tasks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_all::<Task>(&pool, cache, &key).await {
        Ok(tasks) => Ok(CommandResponse::ok(tasks, "tasks.success.listed")),
        Err(e) => Ok(CommandResponse::err(
            "tasks.errors.list_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
