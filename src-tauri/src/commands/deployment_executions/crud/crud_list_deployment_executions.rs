use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::deployment_executions::helpers::open_crypto_context;
use crate::commands::deployment_executions::types::DeploymentExecution;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Lista todas las ejecuciones de un deployment dado su `deployment_id`,
/// ordenadas por `created_at` ascendente (orden de ejecución).
#[tauri::command]
pub async fn crud_list_deployment_executions(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    deployment_id: i64,
) -> Result<CommandResponse<Vec<DeploymentExecution>>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
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
        .map_err(|e| format!("Error al listar deployment_executions: {}", e))
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployment_executions.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut results = Vec::new();
    for row in rows {
        let mut entity = match DeploymentExecution::from_row(&row) {
            Ok(e) => e,
            Err(e) => {
                return Ok(CommandResponse::err(
                    "deployment_executions.errors.list_failed",
                    HashMap::from([("reason".to_string(), e)]),
                ))
            }
        };
        let mut fields = entity.to_fields_all();
        if let Err(e) =
            db::apply_decryption::<DeploymentExecution>(&mut fields, cache, &pool, &key).await
        {
            return Ok(CommandResponse::err(
                "deployment_executions.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ));
        }
        entity = match DeploymentExecution::from_fields(fields) {
            Ok(e) => e,
            Err(e) => {
                return Ok(CommandResponse::err(
                    "deployment_executions.errors.list_failed",
                    HashMap::from([("reason".to_string(), e)]),
                ))
            }
        };
        results.push(entity);
    }

    Ok(CommandResponse::ok(results, "deployment_executions.success.listed"))
}
