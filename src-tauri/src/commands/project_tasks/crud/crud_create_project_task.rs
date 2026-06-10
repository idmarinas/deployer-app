use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::project_tasks::helpers::open_crypto_context;
use crate::commands::project_tasks::types::{CreateProjectTaskInput, ProjectTask};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Asocia una tarea a un proyecto con su orden de ejecución.
#[tauri::command]
pub async fn crud_create_project_task(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    input: CreateProjectTaskInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_tasks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let project_task = input.into_project_task();

    match db::insert::<ProjectTask>(&pool, &project_task, cache, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "project_tasks.success.created")),
        Err(e) => Ok(CommandResponse::err(
            "project_tasks.errors.create_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
