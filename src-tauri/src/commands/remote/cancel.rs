use std::sync::Mutex;

use tauri::State;
use tokio_util::sync::CancellationToken;

/// Mensaje de cancelación por usuario (se emite por el Channel como evento
/// `error` y viaja como `reason` en la respuesta).
pub const CANCELLED_MSG: &str = "Operación cancelada por el usuario";

/// Estado global del job remoto activo (consola remota).
///
/// El frontend serializa las operaciones, así que solo hay un job en curso a la
/// vez. La cancelación se propaga con un `CancellationToken` compartido: cada
/// comando remoto registra el suyo al empezar y el comando
/// `ssh_cancel_remote_job` lo cancela.
#[derive(Default)]
pub struct RemoteJobCancel {
    current: Mutex<Option<CancellationToken>>,
}

impl RemoteJobCancel {
    /// Registra el token del job en curso, reemplazando cualquier anterior.
    pub fn register(&self, token: &CancellationToken) {
        *self.current.lock().unwrap() = Some(token.clone());
    }

    /// Cancela el job remoto en curso (si lo hay).
    pub fn cancel(&self) {
        if let Some(token) = self.current.lock().unwrap().take() {
            token.cancel();
        }
    }
}

/// Cancela el job remoto en curso (consola remota del frontend).
#[tauri::command]
pub async fn ssh_cancel_remote_job(state: State<'_, RemoteJobCancel>) -> Result<(), String> {
    state.cancel();
    Ok(())
}
