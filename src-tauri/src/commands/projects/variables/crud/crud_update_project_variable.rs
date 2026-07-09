use std::collections::HashMap;
use serde_json::Value;
use tauri::AppHandle;

use crate::commands::projects::variables::helpers::open_crypto_context;
use crate::commands::projects::variables::types::{ProjectVariable, UpdateProjectVariableInput};
use crate::commands::CommandResponse;
use crate::db::{self};

/// Actualiza una variable de proyecto existente por su `id`.
///
/// `value` está cifrado condicionalmente según `is_secret`. Si se actualiza
/// `value` sin enviar `is_secret`, se consulta su valor actual para que la
/// condición de cifrado se evalúe correctamente (ver nota en `global_variables`).
#[tauri::command]
pub async fn crud_update_project_variable(
    app: AppHandle,
    id: i64,
    input: UpdateProjectVariableInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_variables.errors.context_failed",
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
                    "SELECT is_secret FROM project_variables WHERE id = ?1",
                )
                .bind(id)
                .fetch_optional(&pool)
                .await
                {
                    Ok(Some(s)) => s,
                    Ok(None) => {
                        return Ok(CommandResponse::err(
                            "project_variables.errors.not_found",
                            HashMap::from([("id".to_string(), id.to_string())]),
                        ))
                    }
                    Err(e) => {
                        return Ok(CommandResponse::err(
                            "project_variables.errors.fetch_failed",
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
            "SELECT value FROM project_variables WHERE id = ?1",
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
                    "project_variables.errors.not_found",
                    HashMap::from([("id".to_string(), id.to_string())]),
                ))
            }
            Err(e) => {
                return Ok(CommandResponse::err(
                    "project_variables.errors.fetch_failed",
                    HashMap::from([("reason".to_string(), e.to_string())]),
                ))
            }
        }
    }

    if let Some(v) = input.description.to_field_value() {
        fields.push(("description".to_string(), v));
    }

    match db::update_fields::<ProjectVariable>(&pool, id, fields, &key).await {
        Ok(true) => Ok(CommandResponse::ok_empty("project_variables.success.updated")),
        Ok(false) => Ok(CommandResponse::err(
            "project_variables.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("project_variables", "update_failed", e)),
    }
}