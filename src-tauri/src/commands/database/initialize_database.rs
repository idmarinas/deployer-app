use crate::helpers::open_pool;
use crate::response::CommandResponse;
use crate::params;
use std::time::Duration;
use tauri::AppHandle;
use tokio::time::{sleep_until, Instant};

/// Inicializa la base de datos SQLite en la ruta indicada por el frontend.
/// Devuelve siempre un CommandResponse con clave de traducción y parámetros.
/// Espera como mínimo 1 segundo antes de devolver el resultado.
#[tauri::command]
pub async fn initialize_database(app: AppHandle) -> CommandResponse<()> {
    let deadline = Instant::now() + Duration::from_secs(1);

    let pool = match open_pool(&app).await {
        Ok((p, _)) => p,
        Err(e) => {
            sleep_until(deadline).await;
            return CommandResponse::err(
                "tauri.database.errors.initialization_failed",
                params!("reason" => e),
            );
        }
    };

    pool.close().await;

    sleep_until(deadline).await;

    CommandResponse::ok_empty("tauri.database.success.initialized")
}
