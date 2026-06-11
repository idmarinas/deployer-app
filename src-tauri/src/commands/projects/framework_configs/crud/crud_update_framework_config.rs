use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::projects::framework_configs::helpers::open_crypto_context;
use crate::commands::projects::framework_configs::types::{FrameworkConfig, UpdateFrameworkConfigInput};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Actualiza los campos mutables de una configuración de framework.
/// `project_id`, `framework` y `key` son inmutables tras la creación.
#[tauri::command]
pub async fn crud_update_framework_config(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdateFrameworkConfigInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "framework_configs.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let current = match db::fetch_one::<FrameworkConfig>(&pool, id, cache, &key).await {
        Ok(Some(fc)) => fc,
        Ok(None) => {
            return Ok(CommandResponse::err(
                "framework_configs.errors.not_found",
                HashMap::from([("id".to_string(), id.to_string())]),
            ))
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "framework_configs.errors.fetch_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let updated = FrameworkConfig {
        id: current.id,
        project_id: current.project_id,
        framework: current.framework,
        key: current.key,
        value: input.value.unwrap_or(current.value),
        is_secret: input.is_secret.unwrap_or(current.is_secret),
        data_type: input.data_type.unwrap_or(current.data_type),
        description: input.description.or(current.description),
        created_at: current.created_at,
        updated_at: current.updated_at,
    };

    match db::update::<FrameworkConfig>(&pool, id, &updated, cache, &key).await {
        Ok(()) => Ok(CommandResponse::ok_empty("framework_configs.success.updated")),
        Err(e) => Ok(CommandResponse::err(
            "framework_configs.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
