use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::projects::tasks::helpers::open_crypto_context;
use crate::commands::projects::tasks::types::ProjectTask;
use crate::commands::CommandResponse;
use crate::db::{self};

/// Obtiene la asociación proyecto-tarea por su `id`.
#[tauri::command]
pub async fn crud_get_project_task(
    app: AppHandle,
    id: i64,
) -> Result<CommandResponse<ProjectTask>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_tasks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one_frontend::<ProjectTask>(&pool, id, &key).await {
        Ok(Some(pt)) => Ok(CommandResponse::ok(pt, "project_tasks.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "project_tasks.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("project_tasks", "fetch_failed", e)),
    }
}