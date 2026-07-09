use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::projects::variables::helpers::open_crypto_context;
use crate::commands::projects::variables::types::ProjectVariable;
use crate::commands::CommandResponse;
use crate::db::DbEntity;

/// Lista todas las variables de un proyecto dado su `project_id`.
#[tauri::command]
pub async fn crud_list_project_variables(
    app: AppHandle,
    project_id: i64,
) -> Result<CommandResponse<Vec<ProjectVariable>>, String> {
    let (pool, _key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_variables.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let sql = format!(
        "SELECT * FROM {} WHERE project_id = ?1",
        ProjectVariable::table_name()
    );

    let rows = match sqlx::query(&sql)
        .bind(project_id)
        .fetch_all(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_variables.errors.list_failed",
                HashMap::from([("reason".to_string(), e.to_string())]),
            ))
        }
    };

    let results: Vec<ProjectVariable> = match rows
        .into_iter()
        .map(|row| ProjectVariable::from_row(&row).map_err(|e| e.to_string()))
        .collect::<Result<Vec<_>, _>>()
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_variables.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    Ok(CommandResponse::ok(results, "project_variables.success.listed"))
}