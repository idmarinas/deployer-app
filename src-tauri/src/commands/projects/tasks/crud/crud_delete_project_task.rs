use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::projects::tasks::helpers::open_crypto_context;
use crate::commands::projects::tasks::types::ProjectTask;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity};

/// Elimina la asociación proyecto-tarea por su `id`.
#[tauri::command]
pub async fn crud_delete_project_task(
    app: AppHandle,
    id: i64,
) -> Result<CommandResponse<()>, String> {
    let (pool, _) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_tasks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::delete(&pool, ProjectTask::table_name(), id).await {
        Ok(true) => Ok(CommandResponse::ok_empty("project_tasks.success.deleted")),
        Ok(false) => Ok(CommandResponse::err(
            "project_tasks.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("project_tasks", "delete_failed", e)),
    }
}