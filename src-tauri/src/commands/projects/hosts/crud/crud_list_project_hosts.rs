use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::projects::hosts::helpers::open_crypto_context;
use crate::commands::projects::hosts::types::ProjectHost;
use crate::commands::CommandResponse;
use crate::db::DbEntity;

/// Lista todas las asociaciones host de un proyecto dado su `project_id`.
#[tauri::command]
pub async fn crud_list_project_hosts(
    app: AppHandle,
    project_id: i64,
) -> Result<CommandResponse<Vec<ProjectHost>>, String> {
    let (pool, _key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_hosts.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let sql = format!(
        "SELECT * FROM {} WHERE project_id = ?1 ORDER BY deploy_order ASC",
        ProjectHost::table_name()
    );

    let rows = match sqlx::query(&sql)
        .bind(project_id)
        .fetch_all(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_hosts.errors.list_failed",
                HashMap::from([("reason".to_string(), e.to_string())]),
            ))
        }
    };

    let results: Vec<ProjectHost> = match rows
        .into_iter()
        .map(|row| ProjectHost::from_row(&row).map_err(|e| e.to_string()))
        .collect::<Result<Vec<_>, _>>()
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_hosts.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    Ok(CommandResponse::ok(results, "project_hosts.success.listed"))
}