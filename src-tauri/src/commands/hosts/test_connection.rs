use std::time::Duration;
use tauri::AppHandle;
use tokio::time::timeout;

use crate::params;
use crate::response::CommandResponse;
use crate::ssh::connect_to_host_by_id;

/// Timeout por defecto para la conexión SSH (en segundos)
const CONNECTION_TIMEOUT_SECS: u64 = 10;

// ---------------------------------------------------------------------------
// Comando Tauri
// ---------------------------------------------------------------------------

/// Comprueba si es posible establecer una conexión SSH con el host indicado.
///
/// Usa el helper compartido `connect_to_host_by_id` que encapsula:
/// crypto context → SQL query → decrypt → SshSession::connect()
///
/// Devuelve `success: true` si la autenticación fue exitosa, o
/// `success: false` con un mensaje descriptivo en caso de error.
#[tauri::command]
pub async fn test_connection(app: AppHandle, host_id: i64) -> Result<CommandResponse<()>, String> {
    // test_connection debe poder testear hosts deshabilitados
    let connection_result = timeout(
        Duration::from_secs(CONNECTION_TIMEOUT_SECS),
        connect_to_host_by_id(&app, host_id, 0, false),
    )
    .await;

    match connection_result {
        Ok(Ok((session, _host))) => {
            session.disconnect().await;
            Ok(CommandResponse::ok_empty("tauri.hosts.success.connection"))
        }
        Ok(Err(e)) => Ok(CommandResponse::err(
            "tauri.hosts.errors.connection_failed",
            params!("reason" => e),
        )),
        Err(_) => Ok(CommandResponse::err(
            "tauri.hosts.errors.connection_timeout",
            params!("timeout" => CONNECTION_TIMEOUT_SECS.to_string()),
        )),
    }
}
