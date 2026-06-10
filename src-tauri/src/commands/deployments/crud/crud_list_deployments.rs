use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::deployments::helpers::open_crypto_context;
use crate::commands::deployments::types::Deployment;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Lista todos los deployments de un proyecto dado su `project_id`,
/// ordenados por `created_at` descendente (más reciente primero).
#[tauri::command]
pub async fn crud_list_deployments(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    project_id: i64,
) -> Result<CommandResponse<Vec<Deployment>>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
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
        .map_err(|e| format!("Error al listar deployments: {}", e))
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "deployments.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut results = Vec::new();
    for row in rows {
        let mut entity = match Deployment::from_row(&row) {
            Ok(e) => e,
            Err(e) => {
                return Ok(CommandResponse::err(
                    "deployments.errors.list_failed",
                    HashMap::from([("reason".to_string(), e)]),
                ))
            }
        };
        let mut fields = entity.to_fields_all();
        if let Err(e) =
            db::apply_decryption::<Deployment>(&mut fields, cache, &pool, &key).await
        {
            return Ok(CommandResponse::err(
                "deployments.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ));
        }
        entity = match Deployment::from_fields(fields) {
            Ok(e) => e,
            Err(e) => {
                return Ok(CommandResponse::err(
                    "deployments.errors.list_failed",
                    HashMap::from([("reason".to_string(), e)]),
                ))
            }
        };
        results.push(entity);
    }

    Ok(CommandResponse::ok(results, "deployments.success.listed"))
}
