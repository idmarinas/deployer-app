use crate::commands::helpers::open_pool;
use crate::commands::CommandResponse;
use std::collections::HashMap;
use std::time::Duration;
use tauri::AppHandle;
use tokio::time::{sleep_until, Instant};

/// Helper para construir un HashMap de parámetros de forma concisa.
macro_rules! params {
    ($($k:expr => $v:expr),*) => {{
        let mut m = HashMap::new();
        $(m.insert($k.to_string(), $v.to_string());)*
        m
    }};
}

/// Ejecuta todas las migraciones pendientes sobre la base de datos indicada.
/// La ruta del archivo .sqlite se obtiene del store de Tauri.
/// Los archivos .sql se embeben en el binario en tiempo de compilación.
/// Espera como mínimo 1 segundo antes de devolver el resultado.
#[tauri::command]
pub async fn run_migrations(app: AppHandle) -> CommandResponse<()> {
    let deadline = Instant::now() + Duration::from_secs(1);

    let (pool, _path) = match open_pool(&app).await {
        Ok((p, path)) => (p, path),
        Err(e) => {
            sleep_until(deadline).await;
            return CommandResponse::err(
                "migrations.errors.connection_failed",
                params!("reason" => e),
            );
        }
    };

    // Los archivos .sql se embeben en el binario en tiempo de compilación
    let result = sqlx::migrate!().run(&pool).await;

    pool.close().await;
    sleep_until(deadline).await;

    match result {
        Ok(_) => CommandResponse::ok_empty("migrations.success.completed"),
        Err(e) => CommandResponse::err(
            "migrations.errors.migration_failed",
            params!("reason" => e.to_string()),
        ),
    }
}
