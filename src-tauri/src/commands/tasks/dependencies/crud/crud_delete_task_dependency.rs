use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::tasks::dependencies::helpers::open_crypto_context;
use crate::commands::tasks::dependencies::types::TaskDependency;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity};

/// Elimina una dependencia de tarea por su `id`.
#[tauri::command]
pub async fn crud_delete_task_dependency(
    app: AppHandle,
    id: i64,
) -> Result<CommandResponse<()>, String> {
    let (pool, _) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "task_dependencies.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::delete(&pool, TaskDependency::table_name(), id).await {
        Ok(true) => Ok(CommandResponse::ok_empty("task_dependencies.success.deleted")),
        Ok(false) => Ok(CommandResponse::err(
            "task_dependencies.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("task_dependencies", "delete_failed", e)),
    }
}