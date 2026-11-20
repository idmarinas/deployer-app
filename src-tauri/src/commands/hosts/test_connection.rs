use tauri::AppHandle;

use crate::response::CommandResponse;
use crate::ssh::connect_to_host_by_id;
use crate::ssh::keys;

// ---------------------------------------------------------------------------
// Comando Tauri
// ---------------------------------------------------------------------------

/// Comprueba si es posible establecer una conexión SSH con el host indicado.
///
/// Toda la lógica (timeout, verificación de la huella y claves i18n) vive en
/// `ssh/`: aquí solo se reenvía el resultado. Si el host aún no tiene huella
/// guardada, `message_params.fingerprint` trae la clave vista para confirmarla.
#[tauri::command]
pub async fn test_connection(app: AppHandle, host_id: i64) -> Result<CommandResponse<()>, String> {
    // test_connection debe poder testear hosts deshabilitados.
    match connect_to_host_by_id(&app, host_id, 0, false).await {
        Ok((session, _host)) => {
            session.disconnect().await;
            Ok(CommandResponse::ok_empty(keys::CONNECTION_OK))
        }
        Err(e) => Ok(CommandResponse::err(e.key, e.params)),
    }
}
