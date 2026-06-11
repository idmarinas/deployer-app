use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::projects::hosts::helpers::open_crypto_context;
use crate::commands::projects::hosts::types::{CreateProjectHostInput, ProjectHost};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Asocia un host a un proyecto.
#[tauri::command]
pub async fn crud_create_project_host(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    input: CreateProjectHostInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_hosts.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let project_host = input.into_project_host();

    match db::insert::<ProjectHost>(&pool, &project_host, cache, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "project_hosts.success.created")),
        Err(e) => Ok(CommandResponse::err(
            "project_hosts.errors.create_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
