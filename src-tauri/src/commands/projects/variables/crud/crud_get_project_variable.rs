use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::projects::variables::helpers::open_crypto_context;
use crate::commands::projects::variables::types::ProjectVariable;
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Obtiene una variable de proyecto por su `id`.
#[tauri::command]
pub async fn crud_get_project_variable(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<ProjectVariable>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_variables.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one::<ProjectVariable>(&pool, id, cache, &key).await {
        Ok(Some(variable)) => Ok(CommandResponse::ok(variable, "project_variables.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "project_variables.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("project_variables", "fetch_failed", e)),
    }
}
