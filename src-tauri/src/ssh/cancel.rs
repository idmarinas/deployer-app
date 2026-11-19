use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use tauri::State;
use tokio_util::sync::CancellationToken;

/// Mensaje de cancelación por usuario (se emite por el Channel como evento
/// `error` y viaja como `reason` en la respuesta). Definido en `ssh::transfer`
/// para compartirlo con las transferencias SFTP.
pub use crate::ssh::transfer::CANCELLED_MSG;

/// Estado de los jobs remotos activos (consola remota).
///
/// Cada comando remoto registra su propio token con un identificador único y
/// lo retira al terminar. `ssh_cancel_remote_job` cancela el job indicado; si
/// no se pasa id, cancela el último registrado (comportamiento best-effort
/// anterior). Los ids son monotónicos, así que el mayor siempre es el más
/// reciente y nunca se reutilizan.
#[derive(Default)]
pub struct RemoteJobCancel {
    next_id: AtomicU64,
    jobs: Mutex<HashMap<u64, CancellationToken>>,
}

impl RemoteJobCancel {
    /// Registra un job nuevo y devuelve su identificador y su token.
    pub fn register(&self) -> (u64, CancellationToken) {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed) + 1;
        let token = CancellationToken::new();
        self.jobs.lock().unwrap().insert(id, token.clone());
        (id, token)
    }

    /// Retira un job del estado al terminar.
    pub fn unregister(&self, job_id: u64) {
        self.jobs.lock().unwrap().remove(&job_id);
    }

    /// Cancela el job indicado o, sin id, el último registrado.
    pub fn cancel(&self, job_id: Option<u64>) {
        let mut jobs = self.jobs.lock().unwrap();
        let target = job_id.or_else(|| jobs.keys().max().copied());

        if let Some(id) = target {
            if let Some(token) = jobs.remove(&id) {
                token.cancel();
            }
        }
    }
}

/// Retira automáticamente un job del estado cuando el comando sale, tanto por
/// éxito como por error o cancelación.
pub struct RemoteJobGuard<'a> {
    state: &'a RemoteJobCancel,
    job_id: u64,
}

impl<'a> RemoteJobGuard<'a> {
    pub fn new(state: &'a RemoteJobCancel, job_id: u64) -> Self {
        Self { state, job_id }
    }
}

impl Drop for RemoteJobGuard<'_> {
    fn drop(&mut self) {
        self.state.unregister(self.job_id);
    }
}

/// Cancela un job remoto concreto. Sin `job_id`, cancela el último registrado.
#[tauri::command]
pub async fn ssh_cancel_remote_job(
    state: State<'_, RemoteJobCancel>,
    job_id: Option<u64>,
) -> Result<(), String> {
    state.cancel(job_id);
    Ok(())
}
