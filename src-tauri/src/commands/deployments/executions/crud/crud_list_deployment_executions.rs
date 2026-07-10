use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::deployments::executions::helpers::open_crypto_context;
use crate::commands::deployments::executions::types::DeploymentExecution;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity};

/// Lista todas las ejecuciones de un deployment dado su `deployment_id`,
/// ordenadas por `created_at` ascendente (orden de ejecución).
#[tauri::command]
pub async fn crud_list_deployment_executions(
    app: AppHandle,
    deployment_id: i64,
) -> Result<CommandResponse<Vec<DeploymentExecution>>, String> {
    let (pool, _key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_executions.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let sql = format!(
        "SELECT * FROM {} WHERE deployment_id = ?1 ORDER BY created_at ASC",
        DeploymentExecution::table_name()
    );

    let rows = match sqlx::query(&sql)
        .bind(deployment_id)
        .fetch_all(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_executions.errors.list_failed",
                HashMap::from([("reason".to_string(), e.to_string())]),
            ))
        }
    };

    let results: Vec<DeploymentExecution> = match rows
        .into_iter()
        .map(|row| -> Result<DeploymentExecution, String> {
            let mut entity = DeploymentExecution::from_row(&row).map_err(|e| e.to_string())?;
            db::apply_sentinel(&mut entity).map_err(|e| e.to_string())?;
            Ok(entity)
        })
        .collect::<Result<Vec<_>, _>>()
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_executions.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    Ok(CommandResponse::ok(results, "deployment_executions.success.listed"))
}