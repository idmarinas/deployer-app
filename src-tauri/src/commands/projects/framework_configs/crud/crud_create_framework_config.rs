use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::projects::framework_configs::helpers::open_crypto_context;
use crate::commands::projects::framework_configs::types::{CreateFrameworkConfigInput, FrameworkConfig};
use crate::commands::CommandResponse;
use crate::db::{self};

/// Crea una nueva configuración de framework para un proyecto.
#[tauri::command]
pub async fn crud_create_framework_config(
    app: AppHandle,
    input: CreateFrameworkConfigInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "framework_configs.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let config = input.into_framework_config();

    match db::insert::<FrameworkConfig>(&pool, &config, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "framework_configs.success.created")),
        Err(e) => Ok(db::error_to_response("framework_configs", "create_failed", e)),
    }
}