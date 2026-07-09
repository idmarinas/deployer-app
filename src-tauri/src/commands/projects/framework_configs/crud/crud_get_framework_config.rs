use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::projects::framework_configs::helpers::open_crypto_context;
use crate::commands::projects::framework_configs::types::FrameworkConfig;
use crate::commands::CommandResponse;
use crate::db::{self};

/// Obtiene una configuración de framework por su `id`.
#[tauri::command]
pub async fn crud_get_framework_config(
    app: AppHandle,
    id: i64,
) -> Result<CommandResponse<FrameworkConfig>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "framework_configs.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one::<FrameworkConfig>(&pool, id, &key).await {
        Ok(Some(fc)) => Ok(CommandResponse::ok(fc, "framework_configs.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "framework_configs.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("framework_configs", "fetch_failed", e)),
    }
}