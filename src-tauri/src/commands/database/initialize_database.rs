use crate::commands::database::path_to_sqlite_url;
use crate::helpers::create_configured_pool;
use crate::helpers::open_pool;
use crate::response::CommandResponse;
use crate::params;
use std::time::Duration;
use tauri::AppHandle;
use tokio::time::{sleep_until, Instant};

/// Inicializa la base de datos SQLite.
/// Si se proporciona `path`, abre la conexión directamente desde esa ruta;
/// de lo contrario, usa la ruta guardada en el store.
/// Devuelve siempre un CommandResponse con clave de traducción y parámetros.
/// Espera como mínimo 1 segundo antes de devolver el resultado.
#[tauri::command]
pub async fn initialize_database(
    app: AppHandle,
    path: Option<String>,
) -> CommandResponse<()> {
    let deadline = Instant::now() + Duration::from_secs(1);

    let pool = match path {
        Some(p) => {
            let url = path_to_sqlite_url(&p);
            match create_configured_pool(&url).await {
                Ok(pool) => pool,
                Err(e) => {
                    sleep_until(deadline).await;
                    return CommandResponse::err(
                        "tauri.database.errors.initialization_failed",
                        params!("reason" => e),
                    );
                }
            }
        }
        None => match open_pool(&app).await {
            Ok((pool, _)) => pool,
            Err(e) => {
                sleep_until(deadline).await;
                return CommandResponse::err(
                    "tauri.database.errors.initialization_failed",
                    params!("reason" => e),
                );
            }
        },
    };

    pool.close().await;

    sleep_until(deadline).await;

    CommandResponse::ok_empty("tauri.database.success.initialized")
}
