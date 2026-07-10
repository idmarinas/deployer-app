use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::tasks::helpers::open_crypto_context;
use crate::commands::tasks::types::Task;
use crate::commands::CommandResponse;
use crate::db::{self};

/// Obtiene una tarea por su `id`.
#[tauri::command]
pub async fn crud_get_task(
    app: AppHandle,
    id: i64,
) -> Result<CommandResponse<Task>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tasks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one_frontend::<Task>(&pool, id, &key).await {
        Ok(Some(task)) => Ok(CommandResponse::ok(task, "tasks.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "tasks.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("tasks", "fetch_failed", e)),
    }
}