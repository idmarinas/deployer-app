use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::projects::framework_configs::helpers::open_crypto_context;
use crate::commands::projects::framework_configs::types::FrameworkConfig;
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Obtiene una configuración de framework por su `id`.
#[tauri::command]
pub async fn crud_get_framework_config(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<FrameworkConfig>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "framework_configs.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one::<FrameworkConfig>(&pool, id, cache, &key).await {
        Ok(Some(fc)) => Ok(CommandResponse::ok(fc, "framework_configs.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "framework_configs.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "framework_configs.errors.fetch_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
