use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::global_variables::helpers::open_crypto_context;
use crate::commands::global_variables::types::GlobalVariable;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity};

/// Elimina una variable global por su `id`.
#[tauri::command]
pub async fn crud_delete_global_variable(
    app: AppHandle,
    id: i64,
) -> Result<CommandResponse<()>, String> {
    let (pool, _) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "global_variables.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::delete(&pool, GlobalVariable::table_name(), id).await {
        Ok(true) => Ok(CommandResponse::ok_empty("global_variables.success.deleted")),
        Ok(false) => Ok(CommandResponse::err(
            "global_variables.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(db::error_to_response("global_variables", "delete_failed", e)),
    }
}