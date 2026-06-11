use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::projects::variables::helpers::open_crypto_context;
use crate::commands::projects::variables::types::ProjectVariable;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Elimina una variable de proyecto por su `id`.
#[tauri::command]
pub async fn crud_delete_project_variable(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<()>, String> {
    let (pool, _, _) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_variables.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::delete(&pool, ProjectVariable::table_name(), id).await {
        Ok(true) => Ok(CommandResponse::ok_empty("project_variables.success.deleted")),
        Ok(false) => Ok(CommandResponse::err(
            "project_variables.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "project_variables.errors.delete_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
