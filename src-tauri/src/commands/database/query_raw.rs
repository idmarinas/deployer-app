use serde::Serialize;
use serde_json::Value;
use tauri::AppHandle;

use crate::helpers::open_pool;
use crate::params;
use crate::response::CommandResponse;

use super::helpers;

// ====================================================================
// Comando unificado
// ====================================================================

/// Resultado de una query con metadatos de columnas.
#[derive(Debug, Serialize)]
pub struct QueryRawResult {
    /// Nombres de columna en el orden de la query (para mapear filas).
    pub columns: Vec<String>,
    /// Filas con los valores decodificados.
    pub rows: Vec<Vec<Value>>,
}

/// Ejecuta una query SQL arbitraria desde el frontend (Drizzle proxy).
///
/// Comportamiento simplificado: abre pool → vincula params → ejecuta →
/// convierte filas a JSON. El cifrado/descifrado/enmascaramiento de campos
/// sensibles lo gestiona el frontend (Drizzle proxy + stronghold-crypto).
#[tauri::command]
pub async fn query_raw(
    app: AppHandle,
    sql: String,
    params: Option<Vec<Value>>,
) -> Result<CommandResponse<QueryRawResult>, String> {
    let (pool, _) = match open_pool(&app).await {
        Ok(v) => v,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.database.errors.query_raw_open_pool_failed",
                params!("reason" => e),
            ))
        }
    };

    let final_params = params.unwrap_or_default();

    let mut query = sqlx::query(&sql);
    query = helpers::bind_params(query, &final_params);

    let rows = match query.fetch_all(&pool).await {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.database.errors.query_raw_execution_failed",
                params!("reason" => e.to_string()),
            ))
        }
    };

    let result = QueryRawResult {
        columns: helpers::row_column_names(&rows),
        rows: helpers::rows_to_values(&rows),
    };

    Ok(CommandResponse::ok(
        result,
        "tauri.database.success.query_raw_executed",
    ))
}
