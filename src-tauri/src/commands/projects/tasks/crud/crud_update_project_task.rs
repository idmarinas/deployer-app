use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::projects::tasks::helpers::open_crypto_context;
use crate::commands::projects::tasks::types::{ProjectTask, UpdateProjectTaskInput};
use crate::commands::CommandResponse;
use crate::db::{self, EncryptionConfigCache};

/// Actualiza los campos mutables de una asociación proyecto-tarea.
#[tauri::command]
pub async fn crud_update_project_task(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdateProjectTaskInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_tasks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let current = match db::fetch_one::<ProjectTask>(&pool, id, cache, &key).await {
        Ok(Some(pt)) => pt,
        Ok(None) => {
            return Ok(CommandResponse::err(
                "project_tasks.errors.not_found",
                HashMap::from([("id".to_string(), id.to_string())]),
            ))
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_tasks.errors.fetch_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let updated = ProjectTask {
        id: current.id,
        project_id: current.project_id,
        task_id: current.task_id,
        order_execution: input.order_execution.unwrap_or(current.order_execution),
        enabled: input.enabled.unwrap_or(current.enabled),
        condition: input.condition.or(current.condition),
        on_failure: input.on_failure.unwrap_or(current.on_failure),
        created_at: current.created_at,
        updated_at: current.updated_at,
    };

    match db::update::<ProjectTask>(&pool, id, &updated, cache, &key).await {
        Ok(()) => Ok(CommandResponse::ok_empty("project_tasks.success.updated")),
        Err(e) => Ok(CommandResponse::err(
            "project_tasks.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
