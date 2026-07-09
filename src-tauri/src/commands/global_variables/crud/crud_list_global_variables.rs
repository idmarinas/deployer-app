use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::global_variables::helpers::open_crypto_context;
use crate::commands::global_variables::types::GlobalVariable;
use crate::commands::CommandResponse;
use crate::db::{self};

/// Lista todas las variables globales.
#[tauri::command]
pub async fn crud_list_global_variables(
    app: AppHandle,
) -> Result<CommandResponse<Vec<GlobalVariable>>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "global_variables.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_all::<GlobalVariable>(&pool, &key).await {
        Ok(variables) => Ok(CommandResponse::ok(variables, "global_variables.success.listed")),
        Err(e) => Ok(db::error_to_response("global_variables", "list_failed", e)),
    }
}