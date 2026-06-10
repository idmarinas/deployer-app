use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::project_variables::helpers::open_crypto_context;
use crate::commands::project_variables::types::ProjectVariable;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Lista todas las variables de un proyecto dado su `project_id`.
#[tauri::command]
pub async fn crud_list_project_variables(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    project_id: i64,
) -> Result<CommandResponse<Vec<ProjectVariable>>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_variables.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let sql = format!(
        "SELECT * FROM {} WHERE project_id = ?1",
        ProjectVariable::table_name()
    );

    let rows = sqlx::query(&sql)
        .bind(project_id)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Error al listar project_variables: {}", e));

    let rows = match rows {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_variables.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut results = Vec::new();
    for row in rows {
        let mut entity = match ProjectVariable::from_row(&row) {
            Ok(e) => e,
            Err(e) => {
                return Ok(CommandResponse::err(
                    "project_variables.errors.list_failed",
                    HashMap::from([("reason".to_string(), e)]),
                ))
            }
        };
        let mut fields = entity.to_fields_all();
        if let Err(e) = db::apply_decryption::<ProjectVariable>(&mut fields, cache, &pool, &key).await {
            return Ok(CommandResponse::err(
                "project_variables.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ));
        }
        entity = match ProjectVariable::from_fields(fields) {
            Ok(e) => e,
            Err(e) => {
                return Ok(CommandResponse::err(
                    "project_variables.errors.list_failed",
                    HashMap::from([("reason".to_string(), e)]),
                ))
            }
        };
        results.push(entity);
    }

    Ok(CommandResponse::ok(results, "project_variables.success.listed"))
}
