use serde_json::Value;
use sqlx::Column;
use sqlx::Row;
use tauri::AppHandle;

use crate::crypto;
use crate::helpers::{open_crypto_context, open_pool};
use crate::params;
use crate::response::CommandResponse;

use super::helpers;

// ====================================================================
// Comando unificado
// ====================================================================

/// Ejecuta una query SQL arbitraria desde el frontend (Drizzle proxy).
///
/// Comportamiento:
/// - Siempre usa `fetch_all()` para devolver filas reales (SELECT e
///   INSERT/UPDATE/DELETE con RETURNING).
/// - Cifra campos en INSERT/UPDATE cuando se provee `encrypt_mask`.
/// - Descifra campos en SELECT cuando se provee `decrypt_fields`.
/// - Sin cifrado: se abre solo el pool. Con cifrado: se abre crypto context.
#[tauri::command]
pub async fn query_raw(
    app: AppHandle,
    sql: String,
    params: Option<Vec<Value>>,
    encrypt_mask: Option<Vec<bool>>,
    decrypt_fields: Option<Vec<String>>,
    is_write: bool,
    is_read: bool,
) -> Result<CommandResponse<Vec<Vec<Value>>>, String> {
    let needs_encryption = is_write && encrypt_mask.as_ref().is_some_and(|m| m.iter().any(|&b| b));
    let needs_decryption = is_read && decrypt_fields.as_ref().is_some_and(|f| !f.is_empty());

    // ── Abrir contexto ─────────────────────────────────────────────
    let (pool, master_key) = if needs_encryption || needs_decryption {
        match open_crypto_context(&app).await {
            Ok(v) => v,
            Err(e) => {
                return Ok(CommandResponse::err(
                    "tauri.database.errors.query_raw_open_pool_failed",
                    params!("reason" => e),
                ))
            }
        }
    } else {
        match open_pool(&app).await {
            Ok((pool, _)) => (pool, Vec::new()),
            Err(e) => {
                return Ok(CommandResponse::err(
                    "tauri.database.errors.query_raw_open_pool_failed",
                    params!("reason" => e),
                ))
            }
        }
    };

    let mut final_params = params.unwrap_or_default();

    // ── Cifrado en INSERT/UPDATE ───────────────────────────────────
    // encrypt_mask[i] == true → final_params[i] se cifra
    if needs_encryption {
        if let Some(ref mask) = encrypt_mask {
            for (i, should_encrypt) in mask.iter().enumerate() {
                if !should_encrypt {
                    continue;
                }
                if let Some(param) = final_params.get_mut(i) {
                    if let Some(value_str) = param.as_str() {
                        if !value_str.is_empty()
                            && !value_str.starts_with(crypto::keyring::ENCRYPTED_PREFIX)
                        {
                            *param = Value::String(
                                crypto::cipher::encrypt(value_str, &master_key)?,
                            );
                        }
                    }
                }
            }
        }
    }

    // ── Ejecutar SQL ───────────────────────────────────────────────
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

    // ── Convertir filas ────────────────────────────────────────────
    // Para SELECTs con descifrado, necesitamos los nombres de columna
    // para mapear los campos cifrados a sus ordinales correctos.
    if is_read && needs_decryption {
        if let Some(ref fields) = decrypt_fields {
            let mut result: Vec<Vec<Value>> = Vec::with_capacity(rows.len());

            for row in &rows {
                let mut values: Vec<Value> = Vec::with_capacity(row.columns().len());
                for col in row.columns() {
                    let ord = col.ordinal();
                    let mut value = helpers::decode_column_value(row, ord);

                    if fields.contains(&col.name().to_string()) {
                        value = helpers::maybe_decrypt(&value, &master_key)?;
                    }

                    values.push(value);
                }

                result.push(values);
            }

            return Ok(CommandResponse::ok(
                result,
                "tauri.database.success.query_raw_executed",
            ));
        }
    }

    let result = helpers::rows_to_values(&rows);

    Ok(CommandResponse::ok(
        result,
        "tauri.database.success.query_raw_executed",
    ))
}
