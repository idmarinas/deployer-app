use crate::commands::helpers::open_pool;
use crate::commands::store::get_database_path_internal;
use crate::commands::CommandResponse;
use serde::Serialize;
use std::collections::HashMap;
use tauri::AppHandle;
use ts_rs::TS;

#[derive(Serialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct MigrationInfo {
    pub version: i64,
    pub description: String,
    pub installed_on: String,
    pub success: bool,
    pub execution_time_ns: i64,
}

#[derive(Serialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct MigrationsInfo {
    pub count: i64,
    pub applied: Vec<MigrationInfo>,
}

/// Devuelve la lista de migraciones aplicadas desde `_sqlx_migrations`,
/// incluyendo versión, descripción, fecha de instalación, estado y tiempo de ejecución.
#[tauri::command]
pub async fn get_migrations_info(app: AppHandle) -> CommandResponse<MigrationsInfo> {
    let _path = match get_database_path_internal(app.clone()) {
        Ok(Some(p)) => p,
        Ok(None) => {
            return CommandResponse::err(
                "database.errors.path_not_configured",
                HashMap::new(),
            );
        }
        Err(e) => {
            return CommandResponse::err(
                "database.errors.store_error",
                HashMap::from([("reason".to_string(), e)]),
            );
        }
    };

    let pool = match open_pool(&app).await {
        Ok((p, _)) => p,
        Err(e) => {
            return CommandResponse::err(
                "database.errors.initialization_failed",
                HashMap::from([("reason".to_string(), e)]),
            );
        }
    };

    let rows: Vec<(i64, String, String, bool, i64)> = sqlx::query_as(
        "SELECT version, description, installed_on, success, execution_time FROM _sqlx_migrations ORDER BY version",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let count = rows.len() as i64;

    let applied = rows
        .into_iter()
        .map(|(version, description, installed_on, success, execution_time_ns)| {
            MigrationInfo {
                version,
                description,
                installed_on,
                success,
                execution_time_ns,
            }
        })
        .collect();

    pool.close().await;

    CommandResponse::ok(
        MigrationsInfo { count, applied },
        "database.success.migrations",
    )
}
