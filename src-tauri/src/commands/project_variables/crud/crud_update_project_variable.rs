use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::project_variables::helpers::open_crypto_context;
use crate::commands::project_variables::types::{ProjectVariable, UpdateProjectVariableInput};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Actualiza una variable de proyecto existente por su `id`.
#[tauri::command]
pub async fn crud_update_project_variable(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdateProjectVariableInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_variables.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let current = match db::fetch_one::<ProjectVariable>(&pool, id, cache, &key).await {
        Ok(Some(v)) => v,
        Ok(None) => {
            return Ok(CommandResponse::err(
                "project_variables.errors.not_found",
                HashMap::from([("id".to_string(), id.to_string())]),
            ))
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_variables.errors.fetch_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let updated = ProjectVariable {
        id: current.id,
        project_id: current.project_id,
        name: input.name.unwrap_or(current.name),
        value: input.value.unwrap_or(current.value),
        is_secret: input.is_secret.unwrap_or(current.is_secret),
        description: input.description.or(current.description),
        created_at: current.created_at,
        updated_at: current.updated_at,
    };

    match db::update::<ProjectVariable>(&pool, id, &updated, cache, &key).await {
        Ok(()) => Ok(CommandResponse::ok_empty("project_variables.success.updated")),
        Err(e) => Ok(CommandResponse::err(
            "project_variables.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
