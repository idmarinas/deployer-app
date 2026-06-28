use serde_json::Value;
use sqlx::Column;
use sqlx::Row;
use sqlx::ValueRef;
use tauri::AppHandle;

use crate::commands::helpers::open_pool;
use crate::commands::CommandResponse;
use crate::params;

/// Ejecuta una query SELECT arbitraria desde el frontend (Drizzle proxy).
///
/// - Solo permite sentencias SELECT. Cualquier otra instrucción es rechazada.
/// - Los parámetros se pasan como array JSON y se unen a la query con `bind`.
/// - Devuelve las filas como array de arrays JSON, en el mismo orden de columnas
///   que el SELECT (requerido por el modo proxy de Drizzle, que mapea por posición,
///   no por nombre de clave — un HashMap/objeto no garantizaría el orden).
///
/// Este comando NO descifra campos cifrados. Está pensado para tablas sin datos
/// sensibles o para lecturas donde el frontend solo necesita metadatos.
#[tauri::command]
pub async fn query_raw(
    app: AppHandle,
    sql: String,
    params: Option<Vec<Value>>,
) -> CommandResponse<Vec<Vec<Value>>> {
    // Validar que sea un SELECT
    let trimmed = sql.trim().to_lowercase();
    if !trimmed.starts_with("select") {
        let preview: String = sql.chars().take(80).collect();
        return CommandResponse::err(
            "database.errors.query_raw_not_select",
            params!("sql" => preview),
        );
    }

    let (pool, _) = match open_pool(&app).await {
        Ok(v) => v,
        Err(e) => {
            return CommandResponse::err(
                "database.errors.query_raw_open_pool_failed",
                params!("reason" => e),
            )
        }
    };

    let bind_params = params.unwrap_or_default();

    // Construir la query y bindear parámetros
    let mut query = sqlx::query(&sql);
    for param in &bind_params {
        query = match param {
            Value::Null => query.bind(None::<String>),
            Value::Bool(b) => query.bind(*b),
            Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    query.bind(i)
                } else if let Some(f) = n.as_f64() {
                    query.bind(f)
                } else {
                    query.bind(n.to_string())
                }
            }
            Value::String(s) => query.bind(s.clone()),
            // Arrays y objetos se serializan como JSON string
            other => query.bind(other.to_string()),
        };
    }

    let rows = match query.fetch_all(&pool).await {
        Ok(r) => r,
        Err(e) => {
            return CommandResponse::err(
                "database.errors.query_raw_execution_failed",
                params!("reason" => e.to_string()),
            )
        }
    };

    // Convertir las filas a Vec<Vec<Value>>, respetando el orden de columnas del SELECT
    let mut result: Vec<Vec<Value>> = Vec::with_capacity(rows.len());

    for row in &rows {
        let mut values: Vec<Value> = Vec::with_capacity(row.columns().len());

        for col in row.columns() {
            let ord = col.ordinal();
            values.push(decode_column_value(row, ord));
        }

        result.push(values);
    }

    CommandResponse::ok(result, "database.success.query_raw_executed")
}

/// Decodifica el valor de una columna SQLite sin fiarse de `type_info()`.
///
/// SQLite es de tipado dinámico: para columnas calculadas (subqueries,
/// expresiones, agregados) `type_info()` a menudo viene vacío o con un tipo
/// que no refleja el dato real almacenado. En vez de decidir por tipo
/// declarado, se comprueba primero si el valor crudo es NULL (con
/// `try_get_raw().is_null()`) — comprobación explícita, no inferida — y solo
/// si no lo es, se prueba la decodificación en cascada: entero, real,
/// booleano, texto.
///
/// IMPORTANTE: este orden es deliberado. Probar `try_get::<i64, _>` (u otros
/// tipos no-Option) directamente sobre una columna NULL puede no fallar como
/// se espera con algunas combinaciones tipo/valor en sqlx-sqlite, devolviendo
/// `Ok(0)` en vez de `Err` — causando que NULL se decodifique como `0` en
/// vez de `null`. Comprobar `is_null()` explícitamente antes evita ese caso.
fn decode_column_value(row: &sqlx::sqlite::SqliteRow, ordinal: usize) -> Value {
    let is_null = row
        .try_get_raw(ordinal)
        .map(|raw| raw.is_null())
        .unwrap_or(true);

    if is_null {
        return Value::Null;
    }

    if let Ok(v) = row.try_get::<i64, _>(ordinal) {
        return Value::Number(v.into());
    }
    if let Ok(v) = row.try_get::<f64, _>(ordinal) {
        return serde_json::Number::from_f64(v)
            .map(Value::Number)
            .unwrap_or(Value::Null);
    }
    if let Ok(v) = row.try_get::<bool, _>(ordinal) {
        return Value::Bool(v);
    }
    if let Ok(v) = row.try_get::<String, _>(ordinal) {
        return Value::String(v);
    }

    Value::Null
}
