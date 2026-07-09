use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::global_variables::helpers::open_crypto_context;
use crate::commands::global_variables::types::{CreateGlobalVariableInput, GlobalVariable};
use crate::commands::CommandResponse;
use crate::db::{self};

/// Crea una nueva variable global.
#[tauri::command]
pub async fn crud_create_global_variable(
    app: AppHandle,
    input: CreateGlobalVariableInput,
) -> Result<CommandResponse<i64>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "global_variables.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let variable = input.into_global_variable();

    match db::insert::<GlobalVariable>(&pool, &variable, &key).await {
        Ok(id) => Ok(CommandResponse::ok(id, "global_variables.success.created")),
        Err(e) => Ok(db::error_to_response("global_variables", "create_failed", e)),
    }
}