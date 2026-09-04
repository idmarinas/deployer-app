use serde_json::Value;
use sqlx::sqlite::SqliteRow;
use sqlx::Column;
use sqlx::Row;
use sqlx::ValueRef;

// ====================================================================
// Bind de parámetros
// ====================================================================

/// Vincula un array de `Value` a una query sqlx.
pub fn bind_params<'a>(
    mut query: sqlx::query::Query<'a, sqlx::Sqlite, sqlx::sqlite::SqliteArguments<'a>>,
    params: &[Value],
) -> sqlx::query::Query<'a, sqlx::Sqlite, sqlx::sqlite::SqliteArguments<'a>> {
    for param in params {
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
            other => query.bind(other.to_string()),
        };
    }
    query
}

// ====================================================================
// Decodificación de columnas
// ====================================================================

/// Decodifica el valor de una columna SQLite.
///
/// SQLite es de tipado dinámico: se prueba la decodificación en cascada:
/// NULL → entero → real → booleano → texto.
///
/// NO auto-parsea JSON — devuelve siempre `Value::String` para texto.
/// Drizzle en el frontend decide el modo de conversión según el tipo de columna.
pub fn decode_column_value(row: &SqliteRow, ordinal: usize) -> Value {
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

// ====================================================================
// Utilidades
// ====================================================================

/// Convierte filas sqlx a `Vec<Vec<Value>>` usando `decode_column_value`.
pub fn rows_to_values(rows: &[SqliteRow]) -> Vec<Vec<Value>> {
    let mut result: Vec<Vec<Value>> = Vec::with_capacity(rows.len());

    for row in rows {
        let mut values: Vec<Value> = Vec::with_capacity(row.columns().len());
        for col in row.columns() {
            values.push(decode_column_value(row, col.ordinal()));
        }
        result.push(values);
    }

    result
}

/// Devuelve los nombres de columna de la primera fila (en orden de la query).
///
/// Si no hay filas, devuelve una lista vacía. El orden coincide con el de
/// `rows_to_values`, por lo que el frontend puede mapear cada valor por índice.
pub fn row_column_names(rows: &[SqliteRow]) -> Vec<String> {
    if let Some(first) = rows.first() {
        first
            .columns()
            .iter()
            .map(|c| c.name().to_string())
            .collect()
    } else {
        Vec::new()
    }
}
