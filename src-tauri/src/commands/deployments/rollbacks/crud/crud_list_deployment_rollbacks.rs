use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::deployments::rollbacks::helpers::open_crypto_context;
use crate::commands::deployments::rollbacks::types::DeploymentRollback;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity};

/// Lista todos los rollbacks de un deployment dado su `deployment_id`,
/// ordenados por `created_at` descendente.
#[tauri::command]
pub async fn crud_list_deployment_rollbacks(
    app: AppHandle,
    deployment_id: i64,
) -> Result<CommandResponse<Vec<DeploymentRollback>>, String> {
    let (pool, _key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_rollbacks.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let sql = format!(
        "SELECT * FROM {} WHERE deployment_id = ?1 ORDER BY created_at DESC",
        DeploymentRollback::table_name()
    );

    let rows = match sqlx::query(&sql)
        .bind(deployment_id)
        .fetch_all(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_rollbacks.errors.list_failed",
                HashMap::from([("reason".to_string(), e.to_string())]),
            ))
        }
    };

    let results: Vec<DeploymentRollback> = match rows
        .into_iter()
        .map(|row| -> Result<DeploymentRollback, String> {
            let mut entity = DeploymentRollback::from_row(&row).map_err(|e| e.to_string())?;
            db::apply_sentinel(&mut entity).map_err(|e| e.to_string())?;
            Ok(entity)
        })
        .collect::<Result<Vec<_>, _>>()
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_rollbacks.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    Ok(CommandResponse::ok(results, "deployment_rollbacks.success.listed"))
}