use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::deployments::executions::helpers::open_crypto_context;
use crate::commands::deployments::executions::types::{
    CreateDeploymentExecutionInput, DeploymentExecution,
};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Crea un nuevo registro de ejecución en estado `pending`.
#[tauri::command]
pub async fn crud_create_deployment_execution(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    input: CreateDeploymentExecutionInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_executions.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let execution = input.into_deployment_execution();

    match db::insert::<DeploymentExecution>(&pool, &execution, cache, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "deployment_executions.success.created")),
        Err(e) => Ok(db::error_to_response("deployment_executions", "create_failed", e)),
    }
}
