use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::project_tasks::helpers::open_crypto_context;
use crate::commands::project_tasks::types::ProjectTask;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Lista todas las tareas asociadas a un proyecto dado su `project_id`,
/// ordenadas por `order_execution`.
#[tauri::command]
pub async fn crud_list_project_tasks(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    project_id: i64,
) -> Result<CommandResponse<Vec<ProjectTask>>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_tasks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let sql = format!(
        "SELECT * FROM {} WHERE project_id = ?1 ORDER BY order_execution ASC",
        ProjectTask::table_name()
    );

    let rows = match sqlx::query(&sql)
        .bind(project_id)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Error al listar project_tasks: {}", e))
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_tasks.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut results = Vec::new();
    for row in rows {
        let mut entity = match ProjectTask::from_row(&row) {
            Ok(e) => e,
            Err(e) => {
                return Ok(CommandResponse::err(
                    "project_tasks.errors.list_failed",
                    HashMap::from([("reason".to_string(), e)]),
                ))
            }
        };
        let mut fields = entity.to_fields_all();
        if let Err(e) =
            db::apply_decryption::<ProjectTask>(&mut fields, cache, &pool, &key).await
        {
            return Ok(CommandResponse::err(
                "project_tasks.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ));
        }
        entity = match ProjectTask::from_fields(fields) {
            Ok(e) => e,
            Err(e) => {
                return Ok(CommandResponse::err(
                    "project_tasks.errors.list_failed",
                    HashMap::from([("reason".to_string(), e)]),
                ))
            }
        };
        results.push(entity);
    }

    Ok(CommandResponse::ok(results, "project_tasks.success.listed"))
}
