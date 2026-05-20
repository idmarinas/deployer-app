use crate::commands::store::get_database_path;
use serde::Serialize;
use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::collections::HashMap;
use std::str::FromStr;
use std::time::Duration;
use tauri::AppHandle;
use tokio::time::{sleep_until, Instant};
use ts_rs::TS;

#[derive(Serialize, TS)]
#[ts(export, export_to = "tauri-types.ts")]
pub struct MigrationResult {
    pub success: bool,
    pub message_key: String,
    pub message_params: HashMap<String, String>,
}

impl MigrationResult {
    fn ok(key: &str) -> Self {
        Self {
            success: true,
            message_key: key.to_string(),
            message_params: HashMap::new(),
        }
    }

    fn err(key: &str, params: HashMap<String, String>) -> Self {
        Self {
            success: false,
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

/// Ejecuta todas las migraciones pendientes sobre la base de datos indicada.
/// La ruta del archivo .sqlite se obtiene del store de Tauri.
/// Los archivos .sql se embeben en el binario en tiempo de compilación.
/// Espera como mínimo 1 segundo antes de devolver el resultado.
#[tauri::command]
pub async fn run_migrations(app: AppHandle) -> MigrationResult {
    let deadline = Instant::now() + Duration::from_secs(1);

    // Obtener la ruta del store
    let path = match get_database_path(app) {
        Ok(Some(p)) => p,
        Ok(None) => {
            sleep_until(deadline).await;
            return MigrationResult::err("migrations.errors.no_database_path", HashMap::new());
        }
        Err(e) => {
            sleep_until(deadline).await;
            return MigrationResult::err("migrations.errors.store_error", params!("reason" => e));
        }
    };

    let url = format!("sqlite://{}", path);

    let options = match SqliteConnectOptions::from_str(&url) {
        Ok(o) => o,
        Err(e) => {
            sleep_until(deadline).await;
            return MigrationResult::err(
                "migrations.errors.invalid_url",
                params!("path" => path, "reason" => e.to_string()),
            );
        }
    };

    let pool = match SqlitePool::connect_with(options).await {
        Ok(p) => p,
        Err(e) => {
            sleep_until(deadline).await;
            return MigrationResult::err(
                "migrations.errors.connection_failed",
                params!("path" => path, "reason" => e.to_string()),
            );
        }
    };

    // Los archivos .sql se embeben en el binario en tiempo de compilación
    let result = sqlx::migrate!("src/migrations").run(&pool).await;

    pool.close().await;
    sleep_until(deadline).await;

    match result {
        Ok(_) => MigrationResult::ok("migrations.success.completed"),
        Err(e) => MigrationResult::err(
            "migrations.errors.migration_failed",
            params!("reason" => e.to_string()),
        ),
    }
}
