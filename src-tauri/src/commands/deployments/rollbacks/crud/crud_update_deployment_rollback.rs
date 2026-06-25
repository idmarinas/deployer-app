use std::collections::HashMap;
use serde_json::Value;
use tauri::AppHandle;
use tauri::State;

use crate::commands::deployments::rollbacks::helpers::open_crypto_context;
use crate::commands::deployments::rollbacks::types::{
    DeploymentRollback, UpdateDeploymentRollbackInput,
};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Actualiza el estado y campos de ciclo de vida de un rollback.
///
/// `deployment_rollbacks` no tiene columna `updated_at`, así que esa tabla no
/// tiene trigger de auto-actualización; `db::update_fields` funciona igual.
#[tauri::command]
pub async fn crud_update_deployment_rollback(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdateDeploymentRollbackInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_rollbacks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut fields: Vec<(String, Value)> = Vec::new();

    if let Some(status) = input.status {
        fields.push((
            "status".to_string(),
            serde_json::to_value(status).unwrap_or(Value::Null),
        ));
    }
    if let Some(v) = input.started_at.to_field_value() {
        fields.push(("started_at".to_string(), v));
    }
    if let Some(v) = input.finished_at.to_field_value() {
        fields.push(("finished_at".to_string(), v));
    }

    match db::update_fields::<DeploymentRollback>(&pool, id, fields, cache, &key)
        .await
    {
        Ok(true) => Ok(CommandResponse::ok_empty(
            "deployment_rollbacks.success.updated",
        )),
        Ok(false) => Ok(CommandResponse::err(
            "deployment_rollbacks.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "deployment_rollbacks.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
