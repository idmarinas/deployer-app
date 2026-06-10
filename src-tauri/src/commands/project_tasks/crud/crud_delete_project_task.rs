use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::project_tasks::helpers::open_crypto_context;
use crate::commands::project_tasks::types::ProjectTask;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Elimina la asociación proyecto-tarea por su `id`.
#[tauri::command]
pub async fn crud_delete_project_task(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<()>, String> {
    let (pool, _, _) = match open_crypto_context(&app, &cache).await {
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
        Err(e) => Ok(CommandResponse::err(
            "project_tasks.errors.delete_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
