use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::task_dependencies::helpers::open_crypto_context;
use crate::commands::task_dependencies::types::{TaskDependency, UpdateTaskDependencyInput};
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Actualiza el `dependency_type` de una dependencia de tarea.
#[tauri::command]
pub async fn crud_update_task_dependency(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdateTaskDependencyInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "task_dependencies.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    // Verificamos que existe antes de actualizar.
    match db::fetch_one::<TaskDependency>(&pool, id, cache, &key).await {
        Ok(None) => {
            return Ok(CommandResponse::err(
                "task_dependencies.errors.not_found",
                HashMap::from([("id".to_string(), id.to_string())]),
            ))
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "task_dependencies.errors.fetch_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
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
        .map_err(|e| format!("Error al actualizar task_dependency {}: {}", id, e))
    {
        Ok(_) => Ok(CommandResponse::ok_empty("task_dependencies.success.updated")),
        Err(e) => Ok(CommandResponse::err(
            "task_dependencies.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
