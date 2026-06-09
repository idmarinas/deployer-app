use crate::commands::CommandResponse;
use std::time::Duration;
use tokio::time::{sleep_until, Instant};

/// Crea el archivo .sqlite en la ruta indicada por el frontend.
/// Devuelve un CommandResponse con la clave de traducción y parámetros para el frontend.
/// Espera como mínimo 1 segundo antes de devolver el resultado.
#[tauri::command]
pub async fn create_database_file(path: String) -> CommandResponse<()> {
    let deadline = Instant::now() + Duration::from_secs(1);

    let result = match std::fs::File::create(&path) {
        Ok(_) => CommandResponse::ok_empty("database.success.file_created"),
        Err(e) => CommandResponse::err(
            "database.errors.file_creation_failed",
            params!("path" => path, "reason" => e.to_string()),
        ),
    };

    sleep_until(deadline).await;

    result
}
