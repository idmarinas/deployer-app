use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::projects::helpers::open_crypto_context;
use crate::commands::projects::types::{Project, UpdateProjectInput};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Actualiza un proyecto existente por su `id`.
#[tauri::command]
pub async fn crud_update_project(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdateProjectInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "projects.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let current = match db::fetch_one::<Project>(&pool, id, cache, &key).await {
        Ok(Some(project)) => project,
        Ok(None) => {
            return Ok(CommandResponse::err(
                "projects.errors.not_found",
                HashMap::from([("id".to_string(), id.to_string())]),
            ))
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "projects.errors.fetch_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let updated = Project {
        id: current.id,
        name: input.name.unwrap_or(current.name),
        description: input.description.or(current.description),
        repository_url: input.repository_url.or(current.repository_url),
        framework: input.framework.unwrap_or(current.framework),
        enabled: input.enabled.unwrap_or(current.enabled),
        created_at: current.created_at,
        updated_at: current.updated_at,
    };

    match db::update::<Project>(&pool, id, &updated, cache, &key).await {
        Ok(()) => Ok(CommandResponse::ok_empty("projects.success.updated")),
        Err(e) => Ok(CommandResponse::err(
            "projects.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
