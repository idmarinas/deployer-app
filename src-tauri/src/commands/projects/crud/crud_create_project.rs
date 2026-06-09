use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::projects::helpers::open_crypto_context;
use crate::commands::projects::types::{CreateProjectInput, Project};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Crea un nuevo proyecto.
#[tauri::command]
pub async fn crud_create_project(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    input: CreateProjectInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "projects.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let project = input.into_project();

    match db::insert::<Project>(&pool, &project, cache, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "projects.success.created")),
        Err(e) => Ok(CommandResponse::err(
            "projects.errors.create_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
