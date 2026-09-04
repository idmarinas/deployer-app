use crate::commands::database::path_to_sqlite_url;
use crate::helpers::create_configured_pool;
use crate::helpers::open_pool;
use crate::params;
use crate::response::CommandResponse;
use std::time::Duration;
use tauri::AppHandle;
use tokio::time::{sleep_until, Instant};

/// Valida la integridad y estructura de la base de datos SQLite.
/// Si se proporciona `path`, abre la conexión directamente desde esa ruta;
/// de lo contrario, usa la ruta guardada en el store (para flujos donde ya fue persistida).
/// Comprueba la integridad física y la existencia de las tablas principales de la App.
/// Devuelve un CommandResponse con clave de traducción y parámetros para el frontend.
/// Espera como mínimo 1 segundo antes de devolver el resultado.
#[tauri::command]
pub async fn validate_database_sqlite(app: AppHandle, path: Option<String>) -> CommandResponse<()> {
    let deadline = Instant::now() + Duration::from_secs(1);

    // 1. Crear pool de conexión
    let (pool, db_path) = match path {
        Some(p) => {
            let url = path_to_sqlite_url(&p);
            match create_configured_pool(&url).await {
                Ok(pool) => (pool, p),
                Err(e) => {
                    sleep_until(deadline).await;
                    return CommandResponse::err(
                        "tauri.database.errors.initialization_failed",
                        params!("reason" => e),
                    );
                }
            }
        }
        None => match open_pool(&app).await {
            Ok((p, pth)) => (p, pth),
            Err(e) => {
                sleep_until(deadline).await;
                return CommandResponse::err(
                    "tauri.database.errors.initialization_failed",
                    params!("reason" => e),
                );
            }
        },
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
                "tauri.database.errors.integrity_check_failed",
                params!("path" => db_path, "reason" => e.to_string()),
            );
        }
        Ok(result) if result != "ok" => {
            pool.close().await;
            sleep_until(deadline).await;
            return CommandResponse::err(
                "tauri.database.errors.integrity_check_failed",
                params!("path" => db_path, "reason" => result),
            );
        }
        _ => {}
    }

    // 3. Validar tablas requeridas
    let required_tables = [
        crate::tables::TABLE_SETTINGS,
        crate::tables::TABLE_PASSKEYS,
        crate::tables::TABLE_HOSTS,
        crate::tables::TABLE_PROJECTS_DOCKER_COMPOSE,
    ];

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
                    "tauri.database.errors.table_check_failed",
                    params!("table" => table, "reason" => e.to_string()),
                );
            }
            Ok(None) => {
                pool.close().await;
                sleep_until(deadline).await;
                return CommandResponse::err("tauri.database.errors.missing_table", params!());
            }
            _ => {}
        }
    }

    pool.close().await;

    sleep_until(deadline).await;

    CommandResponse::ok_empty("tauri.database.success.validated")
}
