use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::deployments::helpers::open_crypto_context;
use crate::commands::deployments::types::{CreateDeploymentInput, Deployment};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Crea un nuevo deployment en estado `pending`.
#[tauri::command]
pub async fn crud_create_deployment(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    input: CreateDeploymentInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployments.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let deployment = input.into_deployment();

    match db::insert::<Deployment>(&pool, &deployment, cache, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "deployments.success.created")),
        Err(e) => Ok(CommandResponse::err(
            "deployments.errors.create_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
