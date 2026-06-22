use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::collections::HashMap;
use std::str::FromStr;
use std::time::Duration;
use tauri::AppHandle;
use tokio::time::{sleep_until, Instant};

use super::path_to_sqlite_url;
use crate::commands::store::get_database_path_internal;
use crate::commands::CommandResponse;
use crate::params;

/// Inicializa la base de datos SQLite en la ruta indicada por el frontend.
/// Devuelve siempre un CommandResponse con clave de traducción y parámetros.
/// Espera como mínimo 1 segundo antes de devolver el resultado.
#[tauri::command]
pub async fn initialize_database(app: AppHandle) -> CommandResponse<()> {
    let deadline = Instant::now() + Duration::from_secs(1);

    // Obtener la ruta del store
    let path = match get_database_path_internal(app) {
        Ok(Some(p)) => p,
        Ok(None) => {
            sleep_until(deadline).await;
            return CommandResponse::err("migrations.errors.no_database_path", HashMap::new());
        }
        Err(e) => {
            sleep_until(deadline).await;
            return CommandResponse::err("migrations.errors.store_error", params!("reason" => e));
        }
    };

    let url = path_to_sqlite_url(&path);

    let options = match SqliteConnectOptions::from_str(&url) {
        Ok(o) => o,
        Err(e) => {
            sleep_until(deadline).await;
            return CommandResponse::err(
                "database.errors.invalid_url",
                params!("path" => path, "reason" => e.to_string()),
            );
        }
    };

    let pool = match SqlitePool::connect_with(options).await {
        Ok(p) => p,
        Err(e) => {
            sleep_until(deadline).await;
            return CommandResponse::err(
                "database.errors.initialization_failed",
                params!("path" => path, "reason" => e.to_string()),
            );
        }
    };

    pool.close().await;

    sleep_until(deadline).await;

    CommandResponse::ok_empty("database.success.initialized")
}
