use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::tasks::helpers::open_crypto_context;
use crate::commands::tasks::types::Task;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity};

/// Elimina una tarea por su `id`.
#[tauri::command]
pub async fn crud_delete_task(
    app: AppHandle,
    id: i64,
) -> Result<CommandResponse<()>, String> {
    let (pool, _) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tasks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::delete(&pool, Task::table_name(), id).await {
        Ok(true) => Ok(CommandResponse::ok_empty("tasks.success.deleted")),
        Ok(false) => Ok(CommandResponse::err(
            "tasks.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("tasks", "delete_failed", e)),
    }
}