use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::projects::tasks::helpers::open_crypto_context;
use crate::commands::projects::tasks::types::ProjectTask;
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Obtiene la asociación proyecto-tarea por su `id`.
#[tauri::command]
pub async fn crud_get_project_task(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<ProjectTask>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_tasks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one::<ProjectTask>(&pool, id, cache, &key).await {
        Ok(Some(pt)) => Ok(CommandResponse::ok(pt, "project_tasks.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "project_tasks.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("project_tasks", "fetch_failed", e)),
    }
}
