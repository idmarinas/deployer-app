use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::projects::helpers::open_crypto_context;
use crate::commands::projects::types::{CreateProjectInput, Project};
use crate::commands::CommandResponse;
use crate::db::{self};

/// Crea un nuevo proyecto.
#[tauri::command]
pub async fn crud_create_project(
    app: AppHandle,
    input: CreateProjectInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "projects.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let project = input.into_project();

    match db::insert::<Project>(&pool, &project, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "projects.success.created")),
        Err(e) => Ok(db::error_to_response("projects", "create_failed", e)),
    }
}