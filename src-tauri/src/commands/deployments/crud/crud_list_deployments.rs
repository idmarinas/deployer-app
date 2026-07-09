use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::deployments::helpers::open_crypto_context;
use crate::commands::deployments::types::Deployment;
use crate::commands::CommandResponse;
use crate::db::DbEntity;

/// Lista todos los deployments de un proyecto dado su `project_id`,
/// ordenados por `created_at` descendente (más reciente primero).
#[tauri::command]
pub async fn crud_list_deployments(
    app: AppHandle,
    project_id: i64,
) -> Result<CommandResponse<Vec<Deployment>>, String> {
    let (pool, _key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployments.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let sql = format!(
        "SELECT * FROM {} WHERE project_id = ?1 ORDER BY created_at DESC",
        Deployment::table_name()
    );

    let rows = match sqlx::query(&sql)
        .bind(project_id)
        .fetch_all(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployments.errors.list_failed",
                HashMap::from([("reason".to_string(), e.to_string())]),
            ))
        }
    };

    let results: Vec<Deployment> = match rows
        .into_iter()
        .map(|row| Deployment::from_row(&row).map_err(|e| e.to_string()))
        .collect::<Result<Vec<_>, _>>()
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployments.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    Ok(CommandResponse::ok(results, "deployments.success.listed"))
}