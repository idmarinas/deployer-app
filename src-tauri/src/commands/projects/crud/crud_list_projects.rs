use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::projects::helpers::open_crypto_context;
use crate::commands::projects::types::Project;
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Lista todos los proyectos.
#[tauri::command]
pub async fn crud_list_projects(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
) -> Result<CommandResponse<Vec<Project>>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "projects.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_all::<Project>(&pool, cache, &key).await {
        Ok(projects) => Ok(CommandResponse::ok(projects, "projects.success.listed")),
        Err(e) => Ok(CommandResponse::err(
            "projects.errors.list_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
