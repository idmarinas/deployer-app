use serde::Deserialize;
use serde_json::Value;
use sqlx::Column;
use sqlx::Row;
use sqlx::ValueRef;
use tauri::AppHandle;

use crate::crypto;
use crate::helpers::open_crypto_context;
use crate::params;
use crate::response::CommandResponse;

#[derive(Debug, Deserialize)]
pub struct ConditionalEncryptField {
    pub field: String,
    #[allow(dead_code)]
    pub condition: String,
}

/// Ejecuta una query (SELECT/INSERT/UPDATE/DELETE) con cifrado/descifrado automático.
///
/// - `encrypt_fields`: campos a cifrar en INSERT/UPDATE
/// - `decrypt_fields`: campos a descifrar en SELECT
/// - `conditional_encrypt`: campos con cifrado condicional
#[tauri::command]
pub async fn query_raw_with_encryption(
    app: AppHandle,
    sql: String,
    params: Option<Vec<Value>>,
    encrypt_fields: Option<Vec<String>>,
    decrypt_fields: Option<Vec<String>>,
    conditional_encrypt: Option<Vec<ConditionalEncryptField>>,
) -> Result<CommandResponse<Vec<Vec<Value>>>, String> {
    let (pool, master_key) = open_crypto_context(&app).await?;

    let is_write = {
        let upper = sql.trim().to_uppercase();
        upper.starts_with("INSERT") || upper.starts_with("UPDATE") || upper.starts_with("DELETE")
    };

    let is_read = sql.trim().to_uppercase().starts_with("SELECT");

    let mut final_params = params.unwrap_or_default();

    // ── Cifrado en INSERT/UPDATE ─────────────────────────────────────
    if is_write {
        if let Some(ref fields) = encrypt_fields {
            for (i, param) in final_params.iter_mut().enumerate() {
                if let Some(_field_name) = fields.get(i) {
                    if let Some(value_str) = param.as_str() {
                        if !value_str.is_empty() && !value_str.starts_with(crypto::keyring::ENCRYPTED_PREFIX) {
                            *param = Value::String(
                                crypto::cipher::encrypt(value_str, &master_key)?,
                            );
                        }
                    }
                }
            }
        }

        if let Some(ref conditions) = conditional_encrypt {
            for cond in conditions {
                if let Some(field_idx) = encrypt_fields
                    .as_ref()
                    .and_then(|f| f.iter().position(|f| f == &cond.field))
                {
                    let should_encrypt = final_params.iter().enumerate().any(|(idx, p)| {
                        if idx == field_idx {
                            return false;
                        }
                        match p {
                            Value::Bool(b) => *b,
                            Value::Number(n) => n.as_i64().unwrap_or(0) != 0,
                            Value::String(s) => s == "true" || s == "1",
                            _ => false,
                        }
                    });

                    if should_encrypt {
                        if let Some(param) = final_params.get_mut(field_idx) {
                            if let Some(value_str) = param.as_str() {
                                if !value_str.is_empty() && !value_str.starts_with(crypto::keyring::ENCRYPTED_PREFIX) {
                                    *param = Value::String(
                                        crypto::cipher::encrypt(value_str, &master_key)?,
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // ── Ejecutar SQL ─────────────────────────────────────────────────
    let mut query = sqlx::query(&sql);
    for param in &final_params {
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

    let rows = match query.fetch_all(&pool).await {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.database.errors.query_raw_execution_failed",
                params!("reason" => e.to_string()),
            ))
        }
    };

    // ── Descifrado en SELECT + convertir filas ───────────────────────
    let mut result: Vec<Vec<Value>> = Vec::with_capacity(rows.len());

    for row in &rows {
        let mut values: Vec<Value> = Vec::with_capacity(row.columns().len());

        for col in row.columns() {
            let ord = col.ordinal();
            let mut value = decode_column_value(row, ord);

            // Descifrar si es un campo cifrado
            if is_read {
                if let Some(ref fields) = decrypt_fields {
                    if let Some(_field_name) = fields.get(ord) {
                        if let Value::String(s) = &value {
                            if s.starts_with(crypto::keyring::ENCRYPTED_PREFIX) {
                                value = Value::String(
                                    crypto::cipher::decrypt(s, &master_key)?,
                                );
                            }
                        }
                    }
                }
            }

            values.push(value);
        }

        result.push(values);
    }

    Ok(CommandResponse::ok(
        result,
        "tauri.database.success.query_raw_executed",
    ))
}

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
        if v.starts_with(crypto::keyring::ENCRYPTED_PREFIX) {
            return Value::String(v);
        }
        let trimmed = v.trim_start();
        if (trimmed.starts_with('{') || trimmed.starts_with('['))
            && serde_json::from_str::<Value>(&v).is_ok()
        {
            return serde_json::from_str(&v).unwrap_or(Value::String(v));
        }
        return Value::String(v);
    }

    Value::Null
}
