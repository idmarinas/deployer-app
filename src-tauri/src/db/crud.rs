use serde_json::Value;
use sqlx::{
    error::ErrorKind,
    query::Query,
    sqlite::SqliteArguments,
    SqlitePool,
};
use std::collections::HashMap;

use super::cache::EncryptionConfigCache;
use super::entity::DbEntity;
use crate::crypto;
use crate::commands::CommandResponse;

// ============================================================================
// Formateo estructurado de errores SQLite
// ============================================================================

/// Formatea un error sqlx con prefijo estructurado para que el caller pueda
/// identificar el tipo de violación y elegir la clave i18n adecuada.
///
/// Formato: `KIND|detail|mensaje`
pub fn format_sqlx_error(err: &sqlx::Error, table: &str, id: Option<i64>) -> String {
    let (kind, detail) = match err.as_database_error() {
        Some(db_err) => match db_err.kind() {
            ErrorKind::UniqueViolation => ("UNIQUE", db_err.constraint().unwrap_or("")),
            ErrorKind::ForeignKeyViolation => ("FK", db_err.constraint().unwrap_or("")),
            ErrorKind::NotNullViolation => ("NOTNULL", db_err.constraint().unwrap_or("")),
            ErrorKind::CheckViolation => ("CHECK", db_err.constraint().unwrap_or("")),
            _ => ("OTHER", ""),
        },
        None => ("OTHER", ""),
    };
    let id_part = id.map_or(String::new(), |i| format!(" con id {}", i));
    format!(
        "{}|{}|Error en {}:{}: {}",
        kind,
        detail,
        table,
        id_part,
        err
    )
}

/// Convierte un error estructurado (formateado por `format_sqlx_error`) en un
/// `CommandResponse` con la clave i18n adecuada según el tipo de violación.
///
/// `entity` es el prefijo de las claves de traducción (ej. "hosts").
/// `operation` es el subfijo por defecto (ej. "create_failed") cuando no se
/// reconoce el tipo de error.
pub fn error_to_response<T>(
    entity: &str,
    operation: &str,
    err: String,
) -> CommandResponse<T> {
    let mut parts = err.splitn(3, '|');
    let kind = parts.next().unwrap_or("OTHER");
    let _detail = parts.next().unwrap_or("");
    let message = parts.next().unwrap_or(&err);

    match kind {
        "UNIQUE" => CommandResponse::err(
            &format!("{}.errors.duplicate", entity),
            HashMap::from([("reason".to_string(), message.to_string())]),
        ),
        "FK" => CommandResponse::err(
            &format!("{}.errors.referenced_not_found", entity),
            HashMap::from([("reason".to_string(), message.to_string())]),
        ),
        "NOTNULL" => CommandResponse::err(
            &format!("{}.errors.required_field", entity),
            HashMap::new(),
        ),
        _ => CommandResponse::err(
            &format!("{}.errors.{}", entity, operation),
            HashMap::from([("reason".to_string(), err)]),
        ),
    }
}

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
        let should_encrypt_static = E::encrypted_fields().iter().any(|(f, _)| *f == field_str);

        // Cifrado dinámico (leído de encryption_config en SQLite)
        let should_encrypt_db = config
            .get(&(table.to_string(), field_name.clone()))
            .map(|c| c.encrypt)
            .unwrap_or(false);

        // Cifrado condicional (depende del valor de otro campo en la misma fila)
        let should_encrypt_conditional =
            E::conditional_encrypted_fields()
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

        let should_encrypt = should_encrypt_static || should_encrypt_db || should_encrypt_conditional;

        if let Value::String(ref val) = field_value.clone() {
            if crypto::is_encrypted(val) {
                if !should_encrypt {
                    *field_value = Value::String(crypto::decrypt(val, key)?);
                }
            } else if should_encrypt && !val.is_empty() {
                *field_value = Value::String(crypto::encrypt(val, key)?);
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

    let mut query = sqlx::query(&sql);
    for (_, value) in &fields {
        query = bind_value(query, value);
    }

    let result = query
        .execute(pool)
        .await
        .map_err(|e| format_sqlx_error(&e, E::table_name(), None))?;

    Ok(result.last_insert_rowid())
}

/// Actualiza solo los campos indicados de una fila existente por su `id`,
/// sin necesitar la entidad completa ni un `fetch_one` previo.
///
/// A diferencia de `update`, construye un `UPDATE ... SET` dinámico únicamente
/// con las columnas presentes en `fields` (principio de "dirty tracking": solo
/// se tocan en SQL las columnas que el llamador indicó explícitamente).
///
/// `updated_at` NUNCA se incluye aquí: las tablas que tienen esa columna la
/// actualizan solas vía trigger SQL (`AFTER UPDATE`, ver migración). Las tablas
/// sin `updated_at` simplemente no tienen trigger y no pasa nada.
///
/// Devuelve `true` si la fila existía (se actualizó o, si `fields` estaba vacío,
/// simplemente existía), o `false` si no existe ninguna fila con ese `id`.
pub async fn update_fields<E: DbEntity>(
    pool: &SqlitePool,
    id: i64,
    mut fields: Vec<(String, Value)>,
    cache: &EncryptionConfigCache,
    key: &[u8],
) -> Result<bool, String> {
    if fields.is_empty() {
        let sql = format!("SELECT 1 FROM {} WHERE id = ?1", E::table_name());
        let exists = sqlx::query(&sql)
            .bind(id)
            .fetch_optional(pool)
            .await
            .map_err(|e| format_sqlx_error(&e, E::table_name(), Some(id)))?
            .is_some();
        return Ok(exists);
    }

    apply_encryption::<E>(&mut fields, cache, pool, key).await?;

    let set_clause: Vec<String> = fields
        .iter()
        .enumerate()
        .map(|(i, (k, _))| format!("{} = ?{}", k, i + 1))
        .collect();

    let sql = format!(
        "UPDATE {} SET {} WHERE id = ?{}",
        E::table_name(),
        set_clause.join(", "),
        fields.len() + 1
    );

    let mut query = sqlx::query(&sql);
    for (_, value) in &fields {
        query = bind_value(query, value);
    }
    query = query.bind(id);

    let result = query.execute(pool).await.map_err(|e| {
        format_sqlx_error(&e, E::table_name(), Some(id))
    })?;

    Ok(result.rows_affected() > 0)
}

/// Obtiene una fila por su `id`.
pub async fn fetch_one<E: DbEntity>(
    pool: &SqlitePool,
    id: i64,
    cache: &EncryptionConfigCache,
    key: &[u8],
) -> Result<Option<E>, String> {
    let sql = format!("SELECT * FROM {} WHERE id = ?1", E::table_name());

    let row = sqlx::query(&sql)
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format_sqlx_error(&e, E::table_name(), Some(id)))?;

    match row {
        None => Ok(None),
        Some(r) => {
            let mut entity = E::from_row(&r)?;
            let mut fields = entity.to_fields_all();
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

    let rows = sqlx::query(&sql)
        .fetch_all(pool)
        .await
        .map_err(|e| format_sqlx_error(&e, E::table_name(), None))?;

    let mut results = Vec::new();
    for row in rows {
        let mut entity = E::from_row(&row)?;
        let mut fields = entity.to_fields_all();
        apply_decryption::<E>(&mut fields, cache, pool, key).await?;
        entity = E::from_fields(fields)?;
        results.push(entity);
    }

    Ok(results)
}

/// Elimina una fila por su `id`.
pub async fn delete(pool: &SqlitePool, table: &str, id: i64) -> Result<bool, String> {
    let sql = format!("DELETE FROM {} WHERE id = ?1", table);

    let result = sqlx::query(&sql)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| format_sqlx_error(&e, table, Some(id)))?;

    Ok(result.rows_affected() > 0)
}

// ============================================================================
// Helper interno
// ============================================================================

type SqliteQuery<'q> = Query<'q, sqlx::Sqlite, SqliteArguments<'q>>;

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
