use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::tasks::dependencies::helpers::open_crypto_context;
use crate::commands::tasks::dependencies::types::{CreateTaskDependencyInput, TaskDependency};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Crea una nueva dependencia entre tareas.
#[tauri::command]
pub async fn crud_create_task_dependency(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    input: CreateTaskDependencyInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "task_dependencies.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let dependency = input.into_task_dependency();

    match db::insert::<TaskDependency>(&pool, &dependency, cache, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "task_dependencies.success.created")),
        Err(e) => Ok(CommandResponse::err(
            "task_dependencies.errors.create_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
