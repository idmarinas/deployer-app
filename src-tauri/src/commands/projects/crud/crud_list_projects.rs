use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::projects::helpers::open_crypto_context;
use crate::commands::projects::types::Project;
use crate::commands::CommandResponse;
use crate::db::{self};

/// Lista todos los proyectos.
#[tauri::command]
pub async fn crud_list_projects(
    app: AppHandle,
) -> Result<CommandResponse<Vec<Project>>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "projects.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_all_frontend::<Project>(&pool, &key).await {
        Ok(projects) => Ok(CommandResponse::ok(projects, "projects.success.listed")),
        Err(e) => Ok(db::error_to_response("projects", "list_failed", e)),
    }
}