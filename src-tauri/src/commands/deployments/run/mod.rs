pub mod interpolator;
pub mod runner;
pub mod sftp_executor;
pub mod ssh_executor;
pub mod types;

use tauri::ipc::Channel;
use tauri::{AppHandle};

use crate::helpers::open_pool;
use crate::helpers::get_master_key;
use crate::response::CommandResponse;

use types::{ProgressEvent, RunDeploymentInput};

/// Ejecuta un deployment de forma asíncrona, emitiendo progreso por el canal.
///
/// El canal es punto a punto: el frontend crea el Channel<ProgressEvent> y lo
/// pasa al comando. Cada invocación tiene su propio canal — sin ambigüedad entre
/// deployments paralelos.
///
/// El runner detecta automáticamente si hay executions previas en 'success' y las
/// salta (modo reanudación). Si todas están en 'success' el deployment ya está
/// completo y devuelve error informativo.
#[tauri::command]
pub async fn run_deployment(
    app: AppHandle,
    input: RunDeploymentInput,
    channel: Channel<ProgressEvent>,
) -> Result<CommandResponse<()>, String> {
    let (pool, _) = match open_pool(&app).await {
        Ok(p) => p,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.deployments.errors.context_failed",
                std::collections::HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let key = match get_master_key() {
        Ok(k) => k,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.deployments.errors.context_failed",
                std::collections::HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    match runner::run(pool, key, input, channel).await {
        Ok(()) => Ok(CommandResponse::ok_empty("tauri.deployments.success.run_completed")),
        Err(e) => Ok(CommandResponse::err(
            "tauri.deployments.errors.run_failed",
            std::collections::HashMap::from([("reason".to_string(), e)]),
        )),
    }
}
