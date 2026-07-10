use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::projects::framework_configs::helpers::open_crypto_context;
use crate::commands::projects::framework_configs::types::FrameworkConfig;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity};

/// Lista todas las configuraciones de framework de un proyecto dado su `project_id`.
#[tauri::command]
pub async fn crud_list_framework_configs(
    app: AppHandle,
    project_id: i64,
) -> Result<CommandResponse<Vec<FrameworkConfig>>, String> {
    let (pool, _key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "framework_configs.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let sql = format!(
        "SELECT * FROM {} WHERE project_id = ?1 ORDER BY framework, key ASC",
        FrameworkConfig::table_name()
    );

    let rows = match sqlx::query(&sql)
        .bind(project_id)
        .fetch_all(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "framework_configs.errors.list_failed",
                HashMap::from([("reason".to_string(), e.to_string())]),
            ))
        }
    };

    let results: Vec<FrameworkConfig> = match rows
        .into_iter()
        .map(|row| -> Result<FrameworkConfig, String> {
            let mut entity = FrameworkConfig::from_row(&row).map_err(|e| e.to_string())?;
            db::apply_sentinel(&mut entity).map_err(|e| e.to_string())?;
            Ok(entity)
        })
        .collect::<Result<Vec<_>, _>>()
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "framework_configs.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    Ok(CommandResponse::ok(results, "framework_configs.success.listed"))
}