use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::deployments::helpers::open_crypto_context;
use crate::commands::deployments::types::{Deployment, UpdateDeploymentInput};
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Actualiza el estado y campos de ciclo de vida de un deployment.
/// `project_id`, `version`, `tag` y `build` son inmutables tras la creación.
#[tauri::command]
pub async fn crud_update_deployment(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdateDeploymentInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployments.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let current = match db::fetch_one::<Deployment>(&pool, id, cache, &key).await {
        Ok(Some(d)) => d,
        Ok(None) => {
            return Ok(CommandResponse::err(
                "deployments.errors.not_found",
                HashMap::from([("id".to_string(), id.to_string())]),
            ))
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployments.errors.fetch_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let new_status = input.status.unwrap_or(current.status);
    let new_started_at = input.started_at.or(current.started_at);
    let new_finished_at = input.finished_at.or(current.finished_at);
    let new_duration = input.duration_seconds.or(current.duration_seconds);
    let new_notes = input.notes.or(current.notes);

    // deployments no tiene updated_at: query manual.
    let sql = format!(
        "UPDATE {} SET status = ?1, started_at = ?2, finished_at = ?3,
         duration_seconds = ?4, notes = ?5 WHERE id = ?6",
        Deployment::table_name()
    );

    match sqlx::query(&sql)
        .bind(new_status.to_string())
        .bind(new_started_at)
        .bind(new_finished_at)
        .bind(new_duration)
        .bind(new_notes)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Error al actualizar deployment {}: {}", id, e))
    {
        Ok(_) => Ok(CommandResponse::ok_empty("deployments.success.updated")),
        Err(e) => Ok(CommandResponse::err(
            "deployments.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
