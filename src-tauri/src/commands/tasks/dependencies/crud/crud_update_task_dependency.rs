use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::tasks::dependencies::helpers::open_crypto_context;
use crate::commands::tasks::dependencies::types::{TaskDependency, UpdateTaskDependencyInput};
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity};

/// Actualiza el `dependency_type` de una dependencia de tarea.
#[tauri::command]
pub async fn crud_update_task_dependency(
    app: AppHandle,
    id: i64,
    input: UpdateTaskDependencyInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "task_dependencies.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    // Verificamos que existe antes de actualizar.
    match db::fetch_one_frontend::<TaskDependency>(&pool, id, &key).await {
        Ok(None) => {
            return Ok(CommandResponse::err(
                "task_dependencies.errors.not_found",
                HashMap::from([("id".to_string(), id.to_string())]),
            ))
        }
        Err(e) => {
            return Ok(db::error_to_response("task_dependencies", "fetch_failed", e))
        }
        Ok(Some(_)) => {}
    };

    // task_dependencies no tiene updated_at: query manual.
    let sql = format!(
        "UPDATE {} SET dependency_type = ?1 WHERE id = ?2",
        TaskDependency::table_name()
    );

    match sqlx::query(&sql)
        .bind(serde_json::to_string(&input.dependency_type)
            .map_err(|e| e.to_string())?
            .trim_matches('"')
            .to_string())
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| db::format_sqlx_error(&e, TaskDependency::table_name(), Some(id)))
    {
        Ok(_) => Ok(CommandResponse::ok_empty("task_dependencies.success.updated")),
        Err(e) => Ok(db::error_to_response("task_dependencies", "update_failed", e)),
    }
}