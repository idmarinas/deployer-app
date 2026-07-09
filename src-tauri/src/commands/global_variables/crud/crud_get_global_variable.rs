use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::global_variables::helpers::open_crypto_context;
use crate::commands::global_variables::types::GlobalVariable;
use crate::commands::CommandResponse;
use crate::db::{self};

/// Obtiene una variable global por su `id`.
#[tauri::command]
pub async fn crud_get_global_variable(
    app: AppHandle,
    id: i64,
) -> Result<CommandResponse<GlobalVariable>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "global_variables.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one::<GlobalVariable>(&pool, id, &key).await {
        Ok(Some(variable)) => Ok(CommandResponse::ok(variable, "global_variables.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "global_variables.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("global_variables", "fetch_failed", e)),
    }
}