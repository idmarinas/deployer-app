use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::tasks::dependencies::helpers::open_crypto_context;
use crate::commands::tasks::dependencies::types::TaskDependency;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity};

/// Lista todas las dependencias de una tarea dado su `task_id`.
#[tauri::command]
pub async fn crud_list_task_dependencies(
    app: AppHandle,
    task_id: i64,
) -> Result<CommandResponse<Vec<TaskDependency>>, String> {
    let (pool, _key) = match open_crypto_context(&app).await {
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
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "task_dependencies.errors.list_failed",
                HashMap::from([("reason".to_string(), e.to_string())]),
            ))
        }
    };

    let results: Vec<TaskDependency> = match rows
        .into_iter()
        .map(|row| -> Result<TaskDependency, String> {
            let mut entity = TaskDependency::from_row(&row).map_err(|e| e.to_string())?;
            db::apply_sentinel(&mut entity).map_err(|e| e.to_string())?;
            Ok(entity)
        })
        .collect::<Result<Vec<_>, _>>()
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "task_dependencies.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    Ok(CommandResponse::ok(results, "task_dependencies.success.listed"))
}