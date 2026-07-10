use serde_json::Value;
use sqlx::{
    error::ErrorKind,
    query::Query,
    sqlite::{SqliteArguments, SqliteRow},
    Row, SqlitePool,
};
use std::collections::HashMap;

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

/// Determina si un campo está cifrado por mecanismo estático o condicional.
fn is_field_encrypted<E: DbEntity>(
    field_name: &str,
) -> bool {
    let static_enc = E::encrypted_fields().iter().any(|f| *f == field_name);
    let conditional_enc = E::conditional_encrypted_fields()
        .iter()
        .any(|(f, _)| *f == field_name);
    static_enc || conditional_enc
}

/// Sobrescribe en `fields` los valores de campos cifrados con el valor TEXT
/// original de la fila SQL. Esto es necesario porque `from_row` convierte
/// columnas INTEGER a i64, perdiendo el texto cifrado `"ENC:..."`.
fn override_encrypted_fields_from_row<E: DbEntity>(
    fields: &mut Vec<(String, Value)>,
    row: &SqliteRow,
) -> Result<(), String> {
    for (field_name, value) in fields.iter_mut() {
        if !is_field_encrypted::<E>(field_name) {
            continue;
        }
        // Si from_row ya produjo un string, no hace falta sobreescribir
        if value.is_string() {
            continue;
        }
        // Intentar obtener el valor TEXT crudo desde la fila SQL
        if let Ok(raw) = row.try_get::<Option<String>, _>(field_name.as_str()) {
            if let Some(s) = raw {
                *value = Value::String(s);
            }
        }
    }
    Ok(())
}

/// Tras descifrar, convierte valores string de campos cifrados de vuelta
/// al tipo numérico esperado por la entidad (ej. `"22"` → `Value::Number(22)`).
fn coerce_decrypted_values<E: DbEntity>(
    fields: &mut Vec<(String, Value)>,
) {
    for (field_name, value) in fields.iter_mut() {
        if !is_field_encrypted::<E>(field_name) {
            continue;
        }
        if let Value::String(s) = value {
            if let Ok(n) = s.parse::<i64>() {
                *value = Value::Number(n.into());
            }
        }
    }
}

// ============================================================================
// Funciones de cifrado/descifrado sobre campos de una entidad
// ============================================================================

/// Aplica cifrado a los campos de un mapa de valores antes de INSERT/UPDATE.
pub async fn apply_encryption<E: DbEntity>(
    fields: &mut Vec<(String, Value)>,
    key: &[u8],
) -> Result<(), String> {
    // Mapa auxiliar para leer campos condición (is_secret, etc.)
    let values_map: std::collections::HashMap<String, Value> = fields.iter().cloned().collect();

    for (field_name, field_value) in fields.iter_mut() {
        let field_str = field_name.as_str();

        // Cifrado estático (declarado en encrypted_fields del trait)
        let should_encrypt_static = E::encrypted_fields().iter().any(|f| *f == field_str);

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

        let should_encrypt = should_encrypt_static || should_encrypt_conditional;

        match field_value.clone() {
            Value::String(ref val) => {
                if crypto::is_encrypted(val) {
                    if !should_encrypt {
                        *field_value = Value::String(crypto::decrypt(val, key)?);
                    }
                } else if should_encrypt && !val.is_empty() {
                    *field_value = Value::String(crypto::encrypt(val, key)?);
                }
            }
            Value::Number(ref n) => {
                if should_encrypt {
                    let s = n.to_string();
                    *field_value = Value::String(crypto::encrypt(&s, key)?);
                }
            }
            _ => {}
        }
    }

    Ok(())
}

/// Reemplaza con `BLANK_VALUE` cualquier valor de campo cifrado que aún
/// tenga el prefijo `ENC:`. NO descifra nada. Opera sobre fields (pares
/// nombre/valor).
fn apply_sentinel_fields<E: DbEntity>(fields: &mut Vec<(String, Value)>) {
    for (field_name, value) in fields.iter_mut() {
        let field_str = field_name.as_str();
        if !is_field_encrypted::<E>(field_str) {
            continue;
        }
        if let Value::String(s) = value {
            if crypto::is_encrypted(s) {
                *value = Value::String(crypto::BLANK_VALUE.to_string());
            }
        }
    }
}

/// Versión pública de `apply_sentinel_fields` que opera a nivel de entidad.
/// Reemplaza todo valor cifrado (`ENC:...`) de la entidad con `BLANK_VALUE`.
pub fn apply_sentinel<E: DbEntity>(entity: &mut E) -> Result<(), String> {
    let mut fields = entity.to_fields_all();
    apply_sentinel_fields::<E>(&mut fields);
    *entity = E::from_fields(fields)?;
    Ok(())
}

/// Aplica descifrado SOLO a campos condicionales (uso interno: interpolador).
/// Campos estáticos (encrypted_fields) nunca se descifran aquí.
pub async fn apply_decryption<E: DbEntity>(
    fields: &mut Vec<(String, Value)>,
    key: &[u8],
) -> Result<(), String> {
    for (field_name, field_value) in fields.iter_mut() {
        let field_str = field_name.as_str();

        if let Value::String(ref encrypted) = field_value.clone() {
            if !crypto::is_encrypted(encrypted) {
                continue;
            }

            // Solo campos condicionales se descifran (is_secret-based, para el interpolador)
            let is_conditional = E::conditional_encrypted_fields()
                .iter()
                .any(|(value_field, _)| *value_field == field_str);

            if is_conditional {
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
    key: &[u8],
) -> Result<i64, String> {
    let mut fields = entity.to_fields();
    apply_encryption::<E>(&mut fields, key).await?;

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

    apply_encryption::<E>(&mut fields, key).await?;

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
            override_encrypted_fields_from_row::<E>(&mut fields, &r)?;
            apply_decryption::<E>(&mut fields, key).await?;
            coerce_decrypted_values::<E>(&mut fields);
            entity = E::from_fields(fields)?;
            Ok(Some(entity))
        }
    }
}

/// Obtiene todas las filas de la tabla.
#[allow(dead_code)]
pub async fn fetch_all<E: DbEntity>(
    pool: &SqlitePool,
    key: &[u8],
) -> Result<Vec<E>, String> {
    let sql = format!("SELECT * FROM {}", E::table_name());

    let rows = sqlx::query(&sql)
        .fetch_all(pool)
        .await
        .map_err(|e| format_sqlx_error(&e, E::table_name(), None))?;

    let mut results = Vec::new();
    for row in &rows {
        let mut entity = E::from_row(row)?;
        let mut fields = entity.to_fields_all();
        override_encrypted_fields_from_row::<E>(&mut fields, row)?;
        apply_decryption::<E>(&mut fields, key).await?;
        coerce_decrypted_values::<E>(&mut fields);
        entity = E::from_fields(fields)?;
        results.push(entity);
    }

    Ok(results)
}

/// Igual que `fetch_one` pero reemplaza los valores cifrados con `BLANK_VALUE`
/// antes de devolver la entidad. Para uso en comandos CRUD que devuelven datos
/// al frontend.
pub async fn fetch_one_frontend<E: DbEntity>(
    pool: &SqlitePool,
    id: i64,
    _key: &[u8],
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
            override_encrypted_fields_from_row::<E>(&mut fields, &r)?;
            apply_sentinel_fields::<E>(&mut fields);
            coerce_decrypted_values::<E>(&mut fields);
            entity = E::from_fields(fields)?;
            Ok(Some(entity))
        }
    }
}

/// Igual que `fetch_all` pero reemplaza los valores cifrados con `BLANK_VALUE`
/// antes de devolver las entidades. Para uso en comandos CRUD que devuelven
/// datos al frontend.
pub async fn fetch_all_frontend<E: DbEntity>(
    pool: &SqlitePool,
    _key: &[u8],
) -> Result<Vec<E>, String> {
    let sql = format!("SELECT * FROM {}", E::table_name());

    let rows = sqlx::query(&sql)
        .fetch_all(pool)
        .await
        .map_err(|e| format_sqlx_error(&e, E::table_name(), None))?;

    let mut results = Vec::new();
    for row in &rows {
        let mut entity = E::from_row(row)?;
        let mut fields = entity.to_fields_all();
        override_encrypted_fields_from_row::<E>(&mut fields, row)?;
        apply_sentinel_fields::<E>(&mut fields);
        coerce_decrypted_values::<E>(&mut fields);
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
