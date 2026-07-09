use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::projects::tasks::helpers::open_crypto_context;
use crate::commands::projects::tasks::types::{CreateProjectTaskInput, ProjectTask};
use crate::commands::CommandResponse;
use crate::db::{self};

/// Asocia una tarea a un proyecto con su orden de ejecución.
#[tauri::command]
pub async fn crud_create_project_task(
    app: AppHandle,
    input: CreateProjectTaskInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_tasks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let project_task = input.into_project_task();

    match db::insert::<ProjectTask>(&pool, &project_task, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "project_tasks.success.created")),
        Err(e) => Ok(db::error_to_response("project_tasks", "create_failed", e)),
    }
}