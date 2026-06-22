use serde_json::Value;
use sqlx::Column;
use sqlx::Row;
use sqlx::TypeInfo;
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
            let type_info = col.type_info().name().to_lowercase();

            let value: Value = match type_info.as_str() {
                "integer" | "int" | "int4" | "int8" | "bigint" | "smallint" => {
                    match row.try_get::<i64, _>(col.ordinal()) {
                        Ok(v) => Value::Number(v.into()),
                        Err(_) => Value::Null,
                    }
                }
                "real" | "float" | "double" | "numeric" | "decimal" => {
                    match row.try_get::<f64, _>(col.ordinal()) {
                        Ok(v) => serde_json::Number::from_f64(v)
                            .map(Value::Number)
                            .unwrap_or(Value::Null),
                        Err(_) => Value::Null,
                    }
                }
                "boolean" | "bool" => match row.try_get::<bool, _>(col.ordinal()) {
                    Ok(v) => Value::Bool(v),
                    Err(_) => Value::Null,
                },
                _ => {
                    // TEXT, BLOB, tipos desconocidos y NULL → string o null
                    match row.try_get::<Option<String>, _>(col.ordinal()) {
                        Ok(Some(v)) => Value::String(v),
                        Ok(None) => Value::Null,
                        Err(_) => Value::Null,
                    }
                }
            };

            values.push(value);
        }

        result.push(values);
    }

    CommandResponse::ok(result, "database.success.query_raw_executed")
}
