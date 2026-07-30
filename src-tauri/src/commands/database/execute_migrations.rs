use crate::commands::database::path_to_sqlite_url;
use crate::helpers::create_configured_pool;
use crate::helpers::open_pool;
use crate::response::CommandResponse;
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
/// Si se proporciona `path`, abre la conexión directamente desde esa ruta;
/// de lo contrario, usa la ruta guardada en el store.
/// Los archivos .sql se embeben en el binario en tiempo de compilación.
/// Espera como mínimo 1 segundo antes de devolver el resultado.
#[tauri::command]
pub async fn execute_migrations(
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
                        "tauri.migrations.errors.connection_failed",
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
                    "tauri.migrations.errors.connection_failed",
                    params!("reason" => e),
                );
            }
        },
    };

    // Los archivos .sql se embeben en el binario en tiempo de compilación
    let result = sqlx::migrate!().run(&pool).await;

    pool.close().await;
    sleep_until(deadline).await;

    match result {
        Ok(_) => CommandResponse::ok_empty("tauri.migrations.success.completed"),
        Err(e) => CommandResponse::err(
            "tauri.migrations.errors.migration_failed",
            params!("reason" => e.to_string()),
        ),
    }
}
