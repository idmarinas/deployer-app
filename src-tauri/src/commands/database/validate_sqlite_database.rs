use sqlx::SqlitePool;
use std::collections::HashMap;
use std::time::Duration;
use tauri::AppHandle;
use tokio::time::{sleep_until, Instant};

use crate::commands::store::get_database_path_internal;
use crate::commands::CommandResponse;
use super::path_to_sqlite_url;

/// Valida la integridad y estructura de la base de datos SQLite en la ruta indicada.
/// Comprueba la integridad física, las tablas requeridas y los datos iniciales.
/// Devuelve un CommandResponse con clave de traducción y parámetros para el frontend.
/// Espera como mínimo 1 segundo antes de devolver el resultado.
#[tauri::command]
pub async fn validate_sqlite_database(app: AppHandle) -> CommandResponse<()> {
    let deadline = Instant::now() + Duration::from_secs(1);

    // Obtener la ruta del store
    let path = match get_database_path_internal(app) {
        Ok(Some(p)) => p,
        Ok(None) => {
            sleep_until(deadline).await;
            return CommandResponse::err("database.errors.no_database_path", HashMap::new());
        }
        Err(e) => {
            sleep_until(deadline).await;
            return CommandResponse::err("database.errors.store_error", params!("reason" => e));
        }
    };

    let url = path_to_sqlite_url(&path);

    // 1. Crear pool de conexión
    let pool = match SqlitePool::connect(&url).await {
        Ok(p) => p,
        Err(e) => {
            sleep_until(deadline).await;
            return CommandResponse::err(
                "database.errors.initialization_failed",
                params!("path" => path, "reason" => e.to_string()),
            );
        }
    };

    // 2. Validar integridad física
    let integrity: Result<String, _> = sqlx::query_scalar("PRAGMA integrity_check;")
        .fetch_one(&pool)
        .await;

    match integrity {
        Err(e) => {
            pool.close().await;
            sleep_until(deadline).await;
            return CommandResponse::err(
                "database.errors.integrity_check_failed",
                params!("path" => path, "reason" => e.to_string()),
            );
        }
        Ok(result) if result != "ok" => {
            pool.close().await;
            sleep_until(deadline).await;
            return CommandResponse::err(
                "database.errors.integrity_check_failed",
                params!("path" => path, "reason" => result),
            );
        }
        _ => {}
    }

    // 3. Validar tablas requeridas
    let required_tables = ["settings"];

    for table in required_tables {
        let exists: Result<Option<String>, _> =
            sqlx::query_scalar("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
                .bind(table)
                .fetch_optional(&pool)
                .await;

        match exists {
            Err(e) => {
                pool.close().await;
                sleep_until(deadline).await;
                return CommandResponse::err(
                    "database.errors.table_check_failed",
                    params!("table" => table, "reason" => e.to_string()),
                );
            }
            Ok(None) => {
                pool.close().await;
                sleep_until(deadline).await;
                return CommandResponse::err(
                    "database.errors.missing_table",
                    params!("table" => table),
                );
            }
            _ => {}
        }
    }

    pool.close().await;

    sleep_until(deadline).await;

    CommandResponse::ok_empty("database.success.validated")
}
