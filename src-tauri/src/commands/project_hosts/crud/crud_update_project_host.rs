use std::collections::HashMap;
use tauri::AppHandle;
use tauri::State;

use crate::commands::project_hosts::helpers::open_crypto_context;
use crate::commands::project_hosts::types::{ProjectHost, UpdateProjectHostInput};
use crate::commands::CommandResponse;
use crate::db::{self, DbEntity, EncryptionConfigCache};

/// Actualiza `deploy_order` y/o `enabled` de una asociación proyecto-host.
#[tauri::command]
pub async fn crud_update_project_host(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    id: i64,
    input: UpdateProjectHostInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_hosts.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let current = match db::fetch_one::<ProjectHost>(&pool, id, cache, &key).await {
        Ok(Some(ph)) => ph,
        Ok(None) => {
            return Ok(CommandResponse::err(
                "project_hosts.errors.not_found",
                HashMap::from([("id".to_string(), id.to_string())]),
            ))
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "project_hosts.errors.fetch_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let new_deploy_order = input.deploy_order.or(current.deploy_order);
    let new_enabled = input.enabled.unwrap_or(current.enabled);

    // project_hosts no tiene updated_at: usamos query manual sin ese campo.
    let sql = format!(
        "UPDATE {} SET deploy_order = ?1, enabled = ?2 WHERE id = ?3",
        ProjectHost::table_name()
    );

    match sqlx::query(&sql)
        .bind(new_deploy_order)
        .bind(new_enabled)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Error al actualizar project_host {}: {}", id, e))
    {
        Ok(_) => Ok(CommandResponse::ok_empty("project_hosts.success.updated")),
        Err(e) => Ok(CommandResponse::err(
            "project_hosts.errors.update_failed",
            HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
