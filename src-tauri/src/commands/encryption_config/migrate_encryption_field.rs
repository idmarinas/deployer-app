use std::collections::HashMap;
use sqlx::Row;
use tauri::{AppHandle, State};

use crate::commands::helpers::open_crypto_context;
use crate::commands::CommandResponse;
use crate::crypto;
use crate::db::EncryptionConfigCache;

#[tauri::command]
pub async fn migrate_encryption_field(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    table_name: String,
    field_name: String,
    encrypt: bool,
    expose: bool,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "encryption_config.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    // 1. Leer todas las filas de la tabla
    let sql = format!("SELECT id, \"{}\" FROM \"{}\"", field_name, table_name);
    let rows = sqlx::query(&sql)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("error al leer filas de {}: {}", table_name, e))?;

    // 2. Migrar cada fila: cifrar o descifrar según corresponda
    for row in &rows {
        let id: i64 = row.get("id");
        let value: String = match row.try_get::<String, _>(field_name.as_str()) {
            Ok(v) => v,
            Err(_) => match row.try_get::<i64, _>(field_name.as_str()) {
                Ok(n) => n.to_string(),
                Err(_) => continue,
            },
        };

        let new_value = if encrypt {
            if crypto::is_encrypted(&value) {
                continue;
            }
            crypto::encrypt(&value, &key)?
        } else {
            if !crypto::is_encrypted(&value) {
                continue;
            }
            crypto::decrypt(&value, &key)?
        };

        let update_sql = format!("UPDATE \"{}\" SET \"{}\" = ?1 WHERE id = ?2", table_name, field_name);
        sqlx::query(&update_sql)
            .bind(&new_value)
            .bind(id)
            .execute(&pool)
            .await
            .map_err(|e| format!("error al actualizar {}:{}: {}", table_name, id, e))?;
    }

    // 3. Actualizar o insertar la configuración
    sqlx::query(
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
    .await
    .map_err(|e| format!("error al actualizar encryption_config: {}", e))?;

    cache.invalidate().await;

    Ok(CommandResponse::ok_empty(
        "encryption_config.success.migrated",
    ))
}
