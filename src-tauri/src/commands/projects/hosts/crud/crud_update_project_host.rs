use std::collections::HashMap;
use serde_json::Value;
use tauri::AppHandle;

use crate::commands::projects::hosts::helpers::open_crypto_context;
use crate::commands::projects::hosts::types::{ProjectHost, UpdateProjectHostInput};
use crate::commands::CommandResponse;
use crate::db::{self};

/// Actualiza los campos mutables de una asociación proyecto-host.
///
/// `project_hosts` no tiene columna `updated_at`, así que esa tabla no tiene
/// trigger de auto-actualización; `db::update_fields` funciona igual.
#[tauri::command]
pub async fn crud_update_project_host(
    app: AppHandle,
    id: i64,
    input: UpdateProjectHostInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_hosts.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut fields: Vec<(String, Value)> = Vec::new();

    if let Some(enabled) = input.enabled {
        fields.push(("enabled".to_string(), Value::Bool(enabled)));
    }
    if let Some(v) = input.deploy_order.to_field_value() {
        fields.push(("deploy_order".to_string(), v));
    }

    match db::update_fields::<ProjectHost>(&pool, id, fields, &key).await {
        Ok(true) => Ok(CommandResponse::ok_empty("project_hosts.success.updated")),
        Ok(false) => Ok(CommandResponse::err(
            "project_hosts.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("project_hosts", "update_failed", e)),
    }
}