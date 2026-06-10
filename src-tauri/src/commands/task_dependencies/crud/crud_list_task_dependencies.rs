use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::task_dependencies::helpers::open_crypto_context;
use crate::commands::task_dependencies::types::TaskDependency;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Lista todas las dependencias de una tarea dado su `task_id`.
#[tauri::command]
pub async fn crud_list_task_dependencies(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    task_id: i64,
) -> Result<CommandResponse<Vec<TaskDependency>>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "task_dependencies.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let sql = format!(
        "SELECT * FROM {} WHERE task_id = ?1",
        TaskDependency::table_name()
    );

    let rows = match sqlx::query(&sql)
        .bind(task_id)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Error al listar task_dependencies: {}", e))
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "task_dependencies.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut results = Vec::new();
    for row in rows {
        let mut entity = match TaskDependency::from_row(&row) {
            Ok(e) => e,
            Err(e) => {
                return Ok(CommandResponse::err(
                    "task_dependencies.errors.list_failed",
                    HashMap::from([("reason".to_string(), e)]),
                ))
            }
        };
        let mut fields = entity.to_fields_all();
        if let Err(e) =
            db::apply_decryption::<TaskDependency>(&mut fields, cache, &pool, &key).await
        {
            return Ok(CommandResponse::err(
                "task_dependencies.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ));
        }
        entity = match TaskDependency::from_fields(fields) {
            Ok(e) => e,
            Err(e) => {
                return Ok(CommandResponse::err(
                    "task_dependencies.errors.list_failed",
                    HashMap::from([("reason".to_string(), e)]),
                ))
            }
        };
        results.push(entity);
    }

    Ok(CommandResponse::ok(results, "task_dependencies.success.listed"))
}
