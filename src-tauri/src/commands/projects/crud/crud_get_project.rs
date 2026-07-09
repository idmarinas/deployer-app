use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::projects::helpers::open_crypto_context;
use crate::commands::projects::types::Project;
use crate::commands::CommandResponse;
use crate::db::{self};

/// Obtiene un proyecto por su `id`.
#[tauri::command]
pub async fn crud_get_project(
    app: AppHandle,
    id: i64,
) -> Result<CommandResponse<Project>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "projects.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one::<Project>(&pool, id, &key).await {
        Ok(Some(project)) => Ok(CommandResponse::ok(project, "projects.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "projects.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("projects", "fetch_failed", e)),
    }
}