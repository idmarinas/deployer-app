use std::collections::HashMap;
use serde_json::Value;
use tauri::AppHandle;
use tauri::State;

use crate::commands::global_variables::helpers::open_crypto_context;
use crate::commands::global_variables::types::{GlobalVariable, UpdateGlobalVariableInput};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Actualiza una variable global existente por su `id`.
///
/// `value` está cifrado condicionalmente según `is_secret` (`#[db_conditional_encrypt]`).
/// `apply_encryption` decide si cifrar `value` mirando `is_secret` dentro del mismo
/// lote de campos que se envía al `UPDATE`; si se actualiza `value` sin enviar
/// `is_secret`, se consulta su valor actual para que la condición se evalúe bien.
#[tauri::command]
pub async fn crud_update_global_variable(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdateGlobalVariableInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "global_variables.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut fields: Vec<(String, Value)> = Vec::new();

    if let Some(name) = input.name {
        fields.push(("name".to_string(), Value::String(name)));
    }

    if let Some(value) = input.value {
        let is_secret = match input.is_secret {
            Some(s) => s,
            None => {
                match sqlx::query_scalar::<_, bool>(
                    "SELECT is_secret FROM global_variables WHERE id = ?1",
                )
                .bind(id)
                .fetch_optional(&pool)
                .await
                {
                    Ok(Some(s)) => s,
                    Ok(None) => {
                        return Ok(CommandResponse::err(
                            "global_variables.errors.not_found",
                            HashMap::from([("id".to_string(), id.to_string())]),
                        ))
                    }
                    Err(e) => {
                        return Ok(CommandResponse::err(
                            "global_variables.errors.fetch_failed",
                            HashMap::from([("reason".to_string(), e.to_string())]),
                        ))
                    }
                }
            }
        };
        fields.push(("value".to_string(), Value::String(value)));
        fields.push(("is_secret".to_string(), Value::Bool(is_secret)));
    } else if let Some(is_secret) = input.is_secret {
        fields.push(("is_secret".to_string(), Value::Bool(is_secret)));
    }

    if let Some(v) = input.description.to_field_value() {
        fields.push(("description".to_string(), v));
    }

    match db::update_fields::<GlobalVariable>(&pool, id, fields, cache, &key).await {
        Ok(true) => Ok(CommandResponse::ok_empty("global_variables.success.updated")),
        Ok(false) => Ok(CommandResponse::err(
            "global_variables.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "global_variables.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
