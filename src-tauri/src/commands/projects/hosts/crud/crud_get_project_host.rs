use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::projects::hosts::helpers::open_crypto_context;
use crate::commands::projects::hosts::types::ProjectHost;
use crate::commands::CommandResponse;
use crate::db::{self};

/// Obtiene la asociación proyecto-host por su `id`.
#[tauri::command]
pub async fn crud_get_project_host(
    app: AppHandle,
    id: i64,
) -> Result<CommandResponse<ProjectHost>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_hosts.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one_frontend::<ProjectHost>(&pool, id, &key).await {
        Ok(Some(ph)) => Ok(CommandResponse::ok(ph, "project_hosts.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "project_hosts.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("project_hosts", "fetch_failed", e)),
    }
}