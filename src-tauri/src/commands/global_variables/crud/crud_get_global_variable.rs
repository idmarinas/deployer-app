use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::global_variables::helpers::open_crypto_context;
use crate::commands::global_variables::types::GlobalVariable;
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Obtiene una variable global por su `id`.
#[tauri::command]
pub async fn crud_get_global_variable(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
) -> Result<CommandResponse<GlobalVariable>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "global_variables.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match db::fetch_one::<GlobalVariable>(&pool, id, cache, &key).await {
        Ok(Some(variable)) => Ok(CommandResponse::ok(variable, "global_variables.success.fetched")),
        Ok(None) => Ok(CommandResponse::err(
            "global_variables.errors.not_found",
            HashMap::from([("id".to_string(), id.to_string())]),
        )),
        Err(e) => Ok(CommandResponse::err(
            "global_variables.errors.fetch_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
