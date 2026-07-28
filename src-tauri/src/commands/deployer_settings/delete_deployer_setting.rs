use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::deployer_settings::helpers::open_pool;
use crate::response::CommandResponse;

/// Elimina una clave de configuración.
/// Si la clave no existe, devuelve error `not_found`.
#[tauri::command]
pub async fn delete_deployer_setting(
    app: AppHandle,
    key: String,
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
        "DELETE FROM deployer_settings WHERE key = ?1",
    )
    .bind(&key)
    .execute(&pool)
    .await
    .map_err(|e| format!("Error al eliminar deployer_setting '{}': {}", key, e));

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Ok(CommandResponse::ok_empty("deployer_settings.success.deleted"))
        }
        Ok(_) => Ok(CommandResponse::err(
            "deployer_settings.errors.not_found",
            HashMap::from([("key".to_string(), key)]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "deployer_settings.errors.delete_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
