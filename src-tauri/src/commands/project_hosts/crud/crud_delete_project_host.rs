use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::project_hosts::helpers::open_crypto_context;
use crate::commands::project_hosts::types::ProjectHost;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Elimina la asociación proyecto-host por su `id`.
#[tauri::command]
pub async fn crud_delete_project_host(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<()>, String> {
    let (pool, _, _) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_hosts.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::delete(&pool, ProjectHost::table_name(), id).await {
        Ok(true) => Ok(CommandResponse::ok_empty("project_hosts.success.deleted")),
        Ok(false) => Ok(CommandResponse::err(
            "project_hosts.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "project_hosts.errors.delete_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
