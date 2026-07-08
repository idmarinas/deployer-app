use std::collections::HashMap;
use tauri::{AppHandle, State};

use crate::commands::helpers::open_pool;
use crate::commands::CommandResponse;
use crate::db::EncryptionConfigCache;

#[tauri::command]
pub async fn update_encryption_config(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    table_name: String,
    field_name: String,
    encrypt: bool,
    expose: bool,
) -> Result<CommandResponse<()>, String> {
    let (pool, _) = match open_pool(&app).await {
        Ok(p) => p,
        Err(e) => {
            return Ok(CommandResponse::err(
                "encryption_config.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let result = sqlx::query(
        "INSERT INTO encryption_config (table_name, field_name, encrypt, expose)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(table_name, field_name)
         DO UPDATE SET encrypt = excluded.encrypt, expose = excluded.expose, updated_at = CURRENT_TIMESTAMP",
    )
    .bind(&table_name)
    .bind(&field_name)
    .bind(encrypt)
    .bind(expose)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => {
            cache.invalidate().await;
            Ok(CommandResponse::ok_empty(
                "encryption_config.success.updated",
            ))
        }
        Err(e) => Ok(CommandResponse::err(
            "encryption_config.errors.update_failed",
            HashMap::from([("reason".to_string(), e.to_string())]),
        )),
    }
}
