use std::collections::HashMap;
use serde_json::Value;
use tauri::AppHandle;
use tauri::State;

use crate::commands::projects::framework_configs::helpers::open_crypto_context;
use crate::commands::projects::framework_configs::types::{FrameworkConfig, UpdateFrameworkConfigInput};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Actualiza los campos mutables de una configuración de framework.
/// `project_id`, `framework` y `key` son inmutables tras la creación.
///
/// `value` está cifrado condicionalmente según `is_secret`. Si se actualiza
/// `value` sin enviar `is_secret`, se consulta su valor actual para que la
/// condición de cifrado se evalúe correctamente (ver nota en `global_variables`).
#[tauri::command]
pub async fn crud_update_framework_config(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdateFrameworkConfigInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "framework_configs.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut fields: Vec<(String, Value)> = Vec::new();

    if let Some(value) = input.value {
        let is_secret = match input.is_secret {
            Some(s) => s,
            None => {
                match sqlx::query_scalar::<_, bool>(
                    "SELECT is_secret FROM framework_configs WHERE id = ?1",
                )
                .bind(id)
                .fetch_optional(&pool)
                .await
                {
                    Ok(Some(s)) => s,
                    Ok(None) => {
                        return Ok(CommandResponse::err(
                            "framework_configs.errors.not_found",
                            HashMap::from([("id".to_string(), id.to_string())]),
                        ))
                    }
                    Err(e) => {
                        return Ok(CommandResponse::err(
                            "framework_configs.errors.fetch_failed",
                            HashMap::from([("reason".to_string(), e.to_string())]),
                        ))
                    }
                }
            }
        };
        fields.push(("value".to_string(), Value::String(value)));
        fields.push(("is_secret".to_string(), Value::Bool(is_secret)));
    } else if let Some(is_secret) = input.is_secret {
        match sqlx::query_scalar::<_, String>(
            "SELECT value FROM framework_configs WHERE id = ?1",
        )
        .bind(id)
        .fetch_optional(&pool)
        .await
        {
            Ok(Some(current_value)) => {
                fields.push(("value".to_string(), Value::String(current_value)));
                fields.push(("is_secret".to_string(), Value::Bool(is_secret)));
            }
            Ok(None) => {
                return Ok(CommandResponse::err(
                    "framework_configs.errors.not_found",
                    HashMap::from([("id".to_string(), id.to_string())]),
                ))
            }
            Err(e) => {
                return Ok(CommandResponse::err(
                    "framework_configs.errors.fetch_failed",
                    HashMap::from([("reason".to_string(), e.to_string())]),
                ))
            }
        }
    }

    if let Some(data_type) = input.data_type {
        fields.push((
            "data_type".to_string(),
            serde_json::to_value(data_type).unwrap_or(Value::Null),
        ));
    }
    if let Some(v) = input.description.to_field_value() {
        fields.push(("description".to_string(), v));
    }

    match db::update_fields::<FrameworkConfig>(&pool, id, fields, cache, &key).await {
        Ok(true) => Ok(CommandResponse::ok_empty("framework_configs.success.updated")),
        Ok(false) => Ok(CommandResponse::err(
            "framework_configs.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("framework_configs", "update_failed", e)),
    }
}
