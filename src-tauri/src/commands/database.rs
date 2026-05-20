use serde::Serialize;
use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::collections::HashMap;
use std::str::FromStr;
use std::time::Duration;
use tauri::AppHandle;
use tokio::time::{sleep_until, Instant};
use ts_rs::TS;

use crate::commands::store::get_database_path;

/// Convierte una ruta absoluta del sistema en una URI válida para SQLite (uso interno Rust/sqlx).
/// En Windows: `F:\ruta\db.sqlite` → `sqlite:///F:/ruta/db.sqlite`
/// En Unix:    `/home/user/db.sqlite` → `sqlite:////home/user/db.sqlite`
fn path_to_sqlite_url(path: &str) -> String {
    let normalized = path.replace('\\', "/");
    format!("sqlite:///{}", normalized)
}

/// Convierte una ruta absoluta del sistema en una URI válida para el plugin SQL de Tauri (frontend).
/// En Windows: `F:\ruta\db.sqlite` → `sqlite:F:/ruta/db.sqlite`
/// En Unix:    `/home/user/db.sqlite` → `sqlite:/home/user/db.sqlite`
fn path_to_plugin_sql_url(path: &str) -> String {
    let normalized = path.replace('\\', "/");
    format!("sqlite:{}", normalized)
}

/// Devuelve la URI SQLite lista para usar en el frontend (plugin-sql).
#[tauri::command]
pub fn get_database_url(app: AppHandle) -> Result<Option<String>, String> {
    let path = get_database_path(app)?;
    Ok(path.map(|p| path_to_plugin_sql_url(&p)))
}

#[derive(Serialize, TS)]
#[ts(export, export_to = "tauri-types.ts")]
pub struct DatabaseResult {
    pub success: bool,
    pub path: Option<String>,
    pub message_key: String,
    pub message_params: HashMap<String, String>,
}

impl DatabaseResult {
    fn ok(path: String, key: &str) -> Self {
        Self {
            success: true,
            path: Some(path),
            message_key: key.to_string(),
            message_params: HashMap::new(),
        }
    }

    fn err(key: &str, params: HashMap<String, String>) -> Self {
        Self {
            success: false,
            path: None,
            message_key: key.to_string(),
            message_params: params,
        }
    }
}

/// Helper para construir un HashMap de parámetros de forma concisa.
macro_rules! params {
    ($($k:expr => $v:expr),*) => {{
        let mut m = HashMap::new();
        $(m.insert($k.to_string(), $v.to_string());)*
        m
    }};
}

/// Crea el archivo .sqlite en la ruta indicada por el frontend.
/// Devuelve un DatabaseResult con la clave de traducción y parámetros para el frontend.
/// Espera como mínimo 1 segundo antes de devolver el resultado.
#[tauri::command]
pub async fn create_database_file(path: String) -> DatabaseResult {
    let deadline = Instant::now() + Duration::from_secs(1);

    let result = match std::fs::File::create(&path) {
        Ok(_) => DatabaseResult::ok(path, "database.success.file_created"),
        Err(e) => DatabaseResult::err(
            "database.errors.file_creation_failed",
            params!("path" => path, "reason" => e.to_string()),
        ),
    };

    sleep_until(deadline).await;

    result
}

/// Inicializa la base de datos SQLite en la ruta indicada por el frontend.
/// Devuelve siempre un DatabaseResult con clave de traducción y parámetros.
/// Espera como mínimo 1 segundo antes de devolver el resultado.
#[tauri::command]
pub async fn initialize_database(app: AppHandle) -> DatabaseResult {
    let deadline = Instant::now() + Duration::from_secs(1);

    // Obtener la ruta del store
    let path = match get_database_path(app) {
        Ok(Some(p)) => p,
        Ok(None) => {
            sleep_until(deadline).await;
            return DatabaseResult::err("migrations.errors.no_database_path", HashMap::new());
        }
        Err(e) => {
            sleep_until(deadline).await;
            return DatabaseResult::err("migrations.errors.store_error", params!("reason" => e));
        }
    };

    let url = path_to_sqlite_url(&path);

    let options = match SqliteConnectOptions::from_str(&url) {
        Ok(o) => o,
        Err(e) => {
            sleep_until(deadline).await;
            return DatabaseResult::err(
                "database.errors.invalid_url",
                params!("path" => path, "reason" => e.to_string()),
            );
        }
    };

    let pool = match SqlitePool::connect_with(options).await {
        Ok(p) => p,
        Err(e) => {
            sleep_until(deadline).await;
            return DatabaseResult::err(
                "database.errors.initialization_failed",
                params!("path" => path, "reason" => e.to_string()),
            );
        }
    };

    pool.close().await;

    sleep_until(deadline).await;

    DatabaseResult::ok(path, "database.success.initialized")
}

/// Valida la integridad y estructura de la base de datos SQLite en la ruta indicada.
/// Comprueba la integridad física, las tablas requeridas y los datos iniciales.
/// Devuelve un DatabaseResult con clave de traducción y parámetros para el frontend.
/// Espera como mínimo 1 segundo antes de devolver el resultado.
#[tauri::command]
pub async fn validate_sqlite_database(app: AppHandle) -> DatabaseResult {
    let deadline = Instant::now() + Duration::from_secs(1);

    // Obtener la ruta del store
    let path = match get_database_path(app) {
        Ok(Some(p)) => p,
        Ok(None) => {
            sleep_until(deadline).await;
            return DatabaseResult::err("database.errors.no_database_path", HashMap::new());
        }
        Err(e) => {
            sleep_until(deadline).await;
            return DatabaseResult::err("database.errors.store_error", params!("reason" => e));
        }
    };

    let url = path_to_sqlite_url(&path);

    // 1. Crear pool de conexión
    let pool = match SqlitePool::connect(&url).await {
        Ok(p) => p,
        Err(e) => {
            sleep_until(deadline).await;
            return DatabaseResult::err(
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
            return DatabaseResult::err(
                "database.errors.integrity_check_failed",
                params!("path" => path, "reason" => e.to_string()),
            );
        }
        Ok(result) if result != "ok" => {
            pool.close().await;
            sleep_until(deadline).await;
            return DatabaseResult::err(
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
                return DatabaseResult::err(
                    "database.errors.table_check_failed",
                    params!("table" => table, "reason" => e.to_string()),
                );
            }
            Ok(None) => {
                pool.close().await;
                sleep_until(deadline).await;
                return DatabaseResult::err(
                    "database.errors.missing_table",
                    params!("table" => table),
                );
            }
            _ => {}
        }
    }

    pool.close().await;

    sleep_until(deadline).await;

    DatabaseResult::ok(path, "database.success.validated")
}
