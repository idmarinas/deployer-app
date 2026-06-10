use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::tasks::helpers::open_crypto_context;
use crate::commands::tasks::types::Task;
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Obtiene una tarea por su `id`.
#[tauri::command]
pub async fn crud_get_task(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<Task>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tasks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one::<Task>(&pool, id, cache, &key).await {
        Ok(Some(task)) => Ok(CommandResponse::ok(task, "tasks.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "tasks.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "tasks.errors.fetch_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
