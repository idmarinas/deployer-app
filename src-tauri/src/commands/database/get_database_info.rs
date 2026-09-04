use crate::commands::database::store::get_database_path_internal;
use crate::helpers::open_pool;
use crate::response::CommandResponse;
use serde::Serialize;
use std::collections::HashMap;
use tauri::AppHandle;
use ts_rs::TS;

#[derive(Serialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct TableInfo {
    pub name: String,
    pub row_count: i64,
    pub size_bytes: i64,
}

#[derive(Serialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct DatabaseInfo {
    pub path: String,
    pub file_size_bytes: u64,
    pub table_count: i64,
    pub tables: Vec<TableInfo>,
    pub other_tables: Option<OtherTablesInfo>,
    pub page_count: i64,
    pub page_size: i64,
}

#[derive(Serialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct OtherTablesInfo {
    pub count: i64,
    pub row_count: i64,
    pub size_bytes: i64,
    pub names: Vec<String>,
}

/// Calcula el conteo de filas y tamaño estimado de una tabla.
async fn get_table_stats(pool: &sqlx::SqlitePool, table_name: &str) -> (i64, i64) {
    let safe = table_name.replace('"', "\"\"");

    // Conteo de filas
    let row_query = format!("SELECT COUNT(*) FROM \"{}\"", safe);
    let row_count: i64 = sqlx::query_scalar(&row_query)
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    // Tamaño estimado
    let columns: Vec<(String, String)> =
        sqlx::query_as("SELECT name, type FROM pragma_table_info(?)")
            .bind(table_name)
            .fetch_all(pool)
            .await
            .unwrap_or_default();

    let size_bytes = if columns.is_empty() || row_count == 0 {
        0
    } else {
        let mut sum_parts = Vec::new();
        for (col_name, col_type) in &columns {
            let safe_col = col_name.replace('"', "\"\"");
            let upper = col_type.to_uppercase();
            if upper.contains("BLOB") || upper.contains("TEXT") || upper.contains("CLOB") {
                sum_parts.push(format!("COALESCE(SUM(LENGTH(\"{}\")), 0)", safe_col));
            } else {
                sum_parts.push(format!(
                    "SUM(CASE WHEN \"{}\" IS NULL THEN 0 ELSE 8 END)",
                    safe_col
                ));
            }
        }

        if sum_parts.is_empty() {
            0
        } else {
            let sum_expr = sum_parts.join(" + ");
            let size_query = format!("SELECT {} FROM \"{}\"", sum_expr, safe);
            sqlx::query_scalar::<_, i64>(&size_query)
                .fetch_one(pool)
                .await
                .unwrap_or(0)
        }
    };

    (row_count, size_bytes)
}

/// Devuelve información detallada de la base de datos: ruta, tamaño, tablas
/// de la app con conteo de filas y tamaño estimado, otras tablas agrupadas,
/// y métricas de páginas SQLite.
#[tauri::command]
pub async fn get_database_info(app: AppHandle) -> CommandResponse<DatabaseInfo> {
    // 1. Obtener ruta del store
    let path = match get_database_path_internal(app.clone()) {
        Ok(Some(p)) => p,
        Ok(None) => {
            return CommandResponse::err(
                "tauri.database.errors.path_not_configured",
                HashMap::new(),
            );
        }
        Err(e) => {
            return CommandResponse::err(
                "tauri.database.errors.store_error",
                HashMap::from([("reason".to_string(), e)]),
            );
        }
    };

    // 2. Tamaño del archivo
    let file_size_bytes = match std::fs::metadata(&path) {
        Ok(meta) => meta.len(),
        Err(_) => 0,
    };

    // 3. Conectar a la BD
    let pool = match open_pool(&app).await {
        Ok((p, _)) => p,
        Err(e) => {
            return CommandResponse::err(
                "tauri.database.errors.initialization_failed",
                HashMap::from([("reason".to_string(), e)]),
            );
        }
    };

    // 4. PRAGMA page_count y page_size
    let page_count: i64 = sqlx::query_scalar("PRAGMA page_count;")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let page_size: i64 = sqlx::query_scalar("PRAGMA page_size;")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    // 5. Obtener todas las tablas (excluye sqlite_stat1-4, tablas internas de ANALYZE)
    let all_table_names: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT IN ('sqlite_stat1', 'sqlite_stat2', 'sqlite_stat3', 'sqlite_stat4') UNION SELECT 'sqlite_master' ORDER BY name",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let table_count = all_table_names.len() as i64;

    // 6. Separar tablas de la app (prefijo deployer_) de las demás
    let mut app_tables = Vec::new();
    let mut other_names = Vec::new();
    let mut other_row_count: i64 = 0;
    let mut other_size_bytes: i64 = 0;

    for table_name in &all_table_names {
        if table_name.starts_with("deployer_") {
            let (row_count, size_bytes) = get_table_stats(&pool, table_name).await;
            app_tables.push(TableInfo {
                name: table_name.clone(),
                row_count,
                size_bytes,
            });
        } else {
            let (row_count, size_bytes) = get_table_stats(&pool, table_name).await;
            other_names.push(table_name.clone());
            other_row_count += row_count;
            other_size_bytes += size_bytes;
        }
    }

    let other_tables = if other_names.is_empty() {
        None
    } else {
        Some(OtherTablesInfo {
            count: other_names.len() as i64,
            row_count: other_row_count,
            size_bytes: other_size_bytes,
            names: other_names,
        })
    };

    pool.close().await;

    CommandResponse::ok(
        DatabaseInfo {
            path,
            file_size_bytes,
            table_count,
            tables: app_tables,
            other_tables,
            page_count,
            page_size,
        },
        "tauri.database.success.info",
    )
}
