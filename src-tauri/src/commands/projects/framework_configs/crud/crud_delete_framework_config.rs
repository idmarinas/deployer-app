use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::projects::framework_configs::helpers::open_crypto_context;
use crate::commands::projects::framework_configs::types::FrameworkConfig;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Elimina una configuración de framework por su `id`.
#[tauri::command]
pub async fn crud_delete_framework_config(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<()>, String> {
    let (pool, _, _) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "framework_configs.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::delete(&pool, FrameworkConfig::table_name(), id).await {
        Ok(true) => Ok(CommandResponse::ok_empty("framework_configs.success.deleted")),
        Ok(false) => Ok(CommandResponse::err(
            "framework_configs.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "framework_configs.errors.delete_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
