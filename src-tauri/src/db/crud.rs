use serde_json::Value;
use sqlx::{query::Query, sqlite::SqliteArguments, AssertSqlSafe, SqlitePool};

use super::cache::EncryptionConfigCache;
use super::entity::DbEntity;
use crate::crypto;

// ============================================================================
// Funciones de cifrado/descifrado sobre campos de una entidad
// ============================================================================

/// Aplica cifrado a los campos de un mapa de valores antes de INSERT/UPDATE.
pub async fn apply_encryption<E: DbEntity>(
    fields: &mut Vec<(String, Value)>,
    cache: &EncryptionConfigCache,
    pool: &SqlitePool,
    key: &[u8],
) -> Result<(), String> {
    let config = cache.get(pool).await?;
    let table = E::table_name();

    // Mapa auxiliar para leer campos condición (is_secret, etc.)
    let values_map: std::collections::HashMap<String, Value> = fields.iter().cloned().collect();

    for (field_name, field_value) in fields.iter_mut() {
        let field_str = field_name.as_str();

        // Cifrado estático (declarado en encrypted_fields del trait)
        let should_encrypt_static = E::encrypted_fields()
            .iter()
            .any(|(f, _)| *f == field_str);

        // Cifrado dinámico (leído de encryption_config en SQLite)
        let should_encrypt_db = config
            .get(&(table.to_string(), field_name.clone()))
            .map(|c| c.encrypt)
            .unwrap_or(false);

        // Cifrado condicional (depende del valor de otro campo en la misma fila)
        let should_encrypt_conditional = E::conditional_encrypted_fields()
            .iter()
            .any(|(value_field, condition_field)| {
                if *value_field != field_str {
                    return false;
                }
                values_map
                    .get(*condition_field)
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
            });

        if should_encrypt_static || should_encrypt_db || should_encrypt_conditional {
            if let Value::String(ref plaintext) = field_value.clone() {
                *field_value = Value::String(crypto::encrypt(plaintext, key)?);
            }
        }
    }

    Ok(())
}

/// Aplica descifrado a los campos de un mapa de valores tras SELECT.
pub async fn apply_decryption<E: DbEntity>(
    fields: &mut Vec<(String, Value)>,
    cache: &EncryptionConfigCache,
    pool: &SqlitePool,
    key: &[u8],
) -> Result<(), String> {
    let config = cache.get(pool).await?;
    let table = E::table_name();

    for (field_name, field_value) in fields.iter_mut() {
        let field_str = field_name.as_str();

        if let Value::String(ref encrypted) = field_value.clone() {
            if !crypto::is_encrypted(encrypted) {
                continue;
            }

            // expose en encrypted_fields estático
            let expose_static = E::encrypted_fields()
                .iter()
                .find(|(f, _)| *f == field_str)
                .map(|(_, expose)| *expose)
                .unwrap_or(false);

            // expose en encryption_config (SQLite)
            let expose_db = config
                .get(&(table.to_string(), field_name.clone()))
                .map(|c| c.expose)
                .unwrap_or(false);

            // Los campos condicionales siempre se exponen al leer
            let expose_conditional = E::conditional_encrypted_fields()
                .iter()
                .any(|(value_field, _)| *value_field == field_str);

            if expose_static || expose_db || expose_conditional {
                *field_value = Value::String(crypto::decrypt(encrypted, key)?);
            }
        }
    }

    Ok(())
}

// ============================================================================
// Operaciones CRUD genéricas
// ============================================================================

/// Inserta una nueva fila en la tabla de la entidad.
/// Devuelve el `id` generado por SQLite.
pub async fn insert<E: DbEntity>(
    pool: &SqlitePool,
    entity: &E,
    cache: &EncryptionConfigCache,
    key: &[u8],
) -> Result<i64, String> {
    let mut fields = entity.to_fields();
    apply_encryption::<E>(&mut fields, cache, pool, key).await?;

    let columns: Vec<String> = fields.iter().map(|(k, _)| k.clone()).collect();
    let placeholders: Vec<String> = (1..=columns.len()).map(|i| format!("?{}", i)).collect();

    let sql = format!(
        "INSERT INTO {} ({}) VALUES ({})",
        E::table_name(),
        columns.join(", "),
        placeholders.join(", ")
    );

    let mut query = sqlx::query(AssertSqlSafe(sql.clone()));
    for (_, value) in &fields {
        query = bind_value(query, value);
    }

    let result = query
        .execute(pool)
        .await
        .map_err(|e| format!("Error al insertar en {}: {}", E::table_name(), e))?;

    Ok(result.last_insert_rowid())
}

/// Actualiza una fila existente por su `id`.
pub async fn update<E: DbEntity>(
    pool: &SqlitePool,
    id: i64,
    entity: &E,
    cache: &EncryptionConfigCache,
    key: &[u8],
) -> Result<(), String> {
    let mut fields = entity.to_fields();
    apply_encryption::<E>(&mut fields, cache, pool, key).await?;

    let set_clause: Vec<String> = fields
        .iter()
        .enumerate()
        .map(|(i, (k, _))| format!("{} = ?{}", k, i + 1))
        .collect();

    let sql = format!(
        "UPDATE {} SET {}, updated_at = CURRENT_TIMESTAMP WHERE id = ?{}",
        E::table_name(),
        set_clause.join(", "),
        fields.len() + 1
    );

    let mut query = sqlx::query(AssertSqlSafe(sql.clone()));
    for (_, value) in &fields {
        query = bind_value(query, value);
    }
    query = query.bind(id);

    query
        .execute(pool)
        .await
        .map_err(|e| format!("Error al actualizar {} con id {}: {}", E::table_name(), id, e))?;

    Ok(())
}

/// Obtiene una fila por su `id`.
pub async fn fetch_one<E: DbEntity>(
    pool: &SqlitePool,
    id: i64,
    cache: &EncryptionConfigCache,
    key: &[u8],
) -> Result<Option<E>, String> {
    let sql = format!("SELECT * FROM {} WHERE id = ?1", E::table_name());

    let row = sqlx::query(AssertSqlSafe(sql.clone()))
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error al obtener {} con id {}: {}", E::table_name(), id, e))?;

    match row {
        None => Ok(None),
        Some(r) => {
            let mut entity = E::from_row(&r)?;
            let mut fields = entity.to_fields();
            apply_decryption::<E>(&mut fields, cache, pool, key).await?;
            entity = E::from_fields(fields)?;
            Ok(Some(entity))
        }
    }
}

/// Obtiene todas las filas de la tabla.
pub async fn fetch_all<E: DbEntity>(
    pool: &SqlitePool,
    cache: &EncryptionConfigCache,
    key: &[u8],
) -> Result<Vec<E>, String> {
    let sql = format!("SELECT * FROM {}", E::table_name());

    let rows = sqlx::query(AssertSqlSafe(sql.clone()))
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error al listar {}: {}", E::table_name(), e))?;

    let mut results = Vec::new();
    for row in rows {
        let mut entity = E::from_row(&row)?;
        let mut fields = entity.to_fields();
        apply_decryption::<E>(&mut fields, cache, pool, key).await?;
        entity = E::from_fields(fields)?;
        results.push(entity);
    }

    Ok(results)
}

/// Elimina una fila por su `id`.
pub async fn delete(pool: &SqlitePool, table: &str, id: i64) -> Result<bool, String> {
    let sql = format!("DELETE FROM {} WHERE id = ?1", table);

    let result = sqlx::query(AssertSqlSafe(sql.clone()))
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error al eliminar de {} con id {}: {}", table, id, e))?;

    Ok(result.rows_affected() > 0)
}

// ============================================================================
// Helper interno
// ============================================================================

type SqliteQuery<'q> = Query<'q, sqlx::Sqlite, SqliteArguments>;

/// Vincula un `serde_json::Value` a una query de SQLx.
fn bind_value<'q>(query: SqliteQuery<'q>, value: &'q Value) -> SqliteQuery<'q> {
    match value {
        Value::String(s) => query.bind(s.clone()),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                query.bind(i)
            } else if let Some(f) = n.as_f64() {
                query.bind(f)
            } else {
                query.bind(Option::<String>::None)
            }
        }
        Value::Bool(b) => query.bind(*b),
        Value::Null => query.bind(Option::<String>::None),
        _ => query.bind(value.to_string()),
    }
}
