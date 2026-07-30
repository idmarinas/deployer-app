use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::deployer_settings::helpers::open_pool;
use crate::commands::deployer_settings::types::DeployerSetting;
use crate::response::CommandResponse;

/// Obtiene el valor de una clave de configuración.
/// Devuelve `None` en `value` si la clave no existe.
#[tauri::command]
pub async fn get_deployer_setting(
    app: AppHandle,
    key: String,
) -> Result<CommandResponse<DeployerSetting>, String> {
    let (pool, _) = match open_pool(&app).await {
        Ok(p) => p,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.deployer_settings.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let row = sqlx::query_as::<_, DeployerSetting>(
        "SELECT key, value FROM deployer_settings WHERE key = ?1",
    )
    .bind(&key)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Error al obtener deployer_setting '{}': {}", key, e));

    match row {
        Ok(Some(setting)) => Ok(CommandResponse::ok(setting, "tauri.deployer_settings.success.fetched")),
        Ok(None) => Ok(CommandResponse::ok(
            DeployerSetting { key, value: None },
            "tauri.deployer_settings.success.fetched",
        )),
        Err(e) => Ok(CommandResponse::err(
            "tauri.deployer_settings.errors.fetch_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
