use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::deployer_settings::helpers::open_pool;
use crate::commands::deployer_settings::types::DeployerSetting;
use crate::response::CommandResponse;

/// Lista todos los pares clave-valor de configuración.
#[tauri::command]
pub async fn list_deployer_settings(
    app: AppHandle,
) -> Result<CommandResponse<Vec<DeployerSetting>>, String> {
    let (pool, _) = match open_pool(&app).await {
        Ok(p) => p,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployer_settings.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let rows = sqlx::query_as::<_, DeployerSetting>(
        "SELECT key, value FROM deployer_settings ORDER BY key ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Error al listar deployer_settings: {}", e));

    match rows {
        Ok(settings) => Ok(CommandResponse::ok(settings, "deployer_settings.success.listed")),
        Err(e) => Ok(CommandResponse::err(
            "deployer_settings.errors.list_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
