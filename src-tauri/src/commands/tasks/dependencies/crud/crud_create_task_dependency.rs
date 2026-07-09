use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::tasks::dependencies::helpers::open_crypto_context;
use crate::commands::tasks::dependencies::types::{CreateTaskDependencyInput, TaskDependency};
use crate::commands::CommandResponse;
use crate::db::{self};

/// Crea una nueva dependencia entre tareas.
#[tauri::command]
pub async fn crud_create_task_dependency(
    app: AppHandle,
    input: CreateTaskDependencyInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "task_dependencies.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let dependency = input.into_task_dependency();

    match db::insert::<TaskDependency>(&pool, &dependency, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "task_dependencies.success.created")),
        Err(e) => Ok(db::error_to_response("task_dependencies", "create_failed", e)),
    }
}