use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::deployer_settings::helpers::open_pool;
use crate::response::CommandResponse;

/// Inserta o actualiza (upsert) el valor de una clave de configuración.
#[tauri::command]
pub async fn set_deployer_setting(
    app: AppHandle,
    key: String,
    value: String,
) -> Result<CommandResponse<()>, String> {
    let (pool, _) = match open_pool(&app).await {
        Ok(p) => p,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployer_settings.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let result = sqlx::query(
        "INSERT INTO deployer_settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(&key)
    .bind(&value)
    .execute(&pool)
    .await
    .map_err(|e| format!("Error al guardar deployer_setting '{}': {}", key, e));

    match result {
        Ok(_) => Ok(CommandResponse::ok_empty("deployer_settings.success.saved")),
        Err(e) => Ok(CommandResponse::err(
            "deployer_settings.errors.save_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
