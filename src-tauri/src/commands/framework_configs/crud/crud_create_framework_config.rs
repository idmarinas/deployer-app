use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::framework_configs::helpers::open_crypto_context;
use crate::commands::framework_configs::types::{CreateFrameworkConfigInput, FrameworkConfig};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Crea una nueva configuración de framework para un proyecto.
#[tauri::command]
pub async fn crud_create_framework_config(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    input: CreateFrameworkConfigInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "framework_configs.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let config = input.into_framework_config();

    match db::insert::<FrameworkConfig>(&pool, &config, cache, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "framework_configs.success.created")),
        Err(e) => Ok(CommandResponse::err(
            "framework_configs.errors.create_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
