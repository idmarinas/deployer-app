use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::task_dependencies::helpers::open_crypto_context;
use crate::commands::task_dependencies::types::TaskDependency;
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Obtiene una dependencia de tarea por su `id`.
#[tauri::command]
pub async fn crud_get_task_dependency(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<TaskDependency>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "task_dependencies.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one::<TaskDependency>(&pool, id, cache, &key).await {
        Ok(Some(dep)) => Ok(CommandResponse::ok(dep, "task_dependencies.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "task_dependencies.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "task_dependencies.errors.fetch_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
