use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::project_variables::helpers::open_crypto_context;
use crate::commands::project_variables::types::{CreateProjectVariableInput, ProjectVariable};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Crea una nueva variable de proyecto.
#[tauri::command]
pub async fn crud_create_project_variable(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    input: CreateProjectVariableInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_variables.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let variable = input.into_project_variable();

    match db::insert::<ProjectVariable>(&pool, &variable, cache, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "project_variables.success.created")),
        Err(e) => Ok(CommandResponse::err(
            "project_variables.errors.create_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
