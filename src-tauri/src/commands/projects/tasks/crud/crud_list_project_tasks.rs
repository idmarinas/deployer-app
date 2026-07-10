use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::projects::tasks::helpers::open_crypto_context;
use crate::commands::projects::tasks::types::ProjectTask;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity};

/// Lista todas las tareas asociadas a un proyecto dado su `project_id`,
/// ordenadas por `order_execution`.
#[tauri::command]
pub async fn crud_list_project_tasks(
    app: AppHandle,
    project_id: i64,
) -> Result<CommandResponse<Vec<ProjectTask>>, String> {
    let (pool, _key) = match open_crypto_context(&app).await {
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
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_tasks.errors.list_failed",
                HashMap::from([("reason".to_string(), e.to_string())]),
            ))
        }
    };

    let results: Vec<ProjectTask> = match rows
        .into_iter()
        .map(|row| -> Result<ProjectTask, String> {
            let mut entity = ProjectTask::from_row(&row).map_err(|e| e.to_string())?;
            db::apply_sentinel(&mut entity).map_err(|e| e.to_string())?;
            Ok(entity)
        })
        .collect::<Result<Vec<_>, _>>()
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_tasks.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    Ok(CommandResponse::ok(results, "project_tasks.success.listed"))
}