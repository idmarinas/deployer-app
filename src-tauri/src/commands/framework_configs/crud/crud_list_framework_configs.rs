use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::framework_configs::helpers::open_crypto_context;
use crate::commands::framework_configs::types::FrameworkConfig;
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Lista todas las configuraciones de framework de un proyecto dado su `project_id`.
#[tauri::command]
pub async fn crud_list_framework_configs(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    project_id: i64,
) -> Result<CommandResponse<Vec<FrameworkConfig>>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
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
        .map_err(|e| format!("Error al listar framework_configs: {}", e))
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(CommandResponse::err(
                "framework_configs.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut results = Vec::new();
    for row in rows {
        let mut entity = match FrameworkConfig::from_row(&row) {
            Ok(e) => e,
            Err(e) => {
                return Ok(CommandResponse::err(
                    "framework_configs.errors.list_failed",
                    HashMap::from([("reason".to_string(), e)]),
                ))
            }
        };
        let mut fields = entity.to_fields_all();
        if let Err(e) =
            db::apply_decryption::<FrameworkConfig>(&mut fields, cache, &pool, &key).await
        {
            return Ok(CommandResponse::err(
                "framework_configs.errors.list_failed",
                HashMap::from([("reason".to_string(), e)]),
            ));
        }
        entity = match FrameworkConfig::from_fields(fields) {
            Ok(e) => e,
            Err(e) => {
                return Ok(CommandResponse::err(
                    "framework_configs.errors.list_failed",
                    HashMap::from([("reason".to_string(), e)]),
                ))
            }
        };
        results.push(entity);
    }

    Ok(CommandResponse::ok(results, "framework_configs.success.listed"))
}
