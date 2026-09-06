use crate::helpers::open_pool;
use crate::response::CommandResponse;
use sqlx::migrate::Migrate;
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

/// Comprueba si la base de datos tiene migraciones pendientes.
/// Devuelve `true` en el campo `data` si hay cambios pendientes por aplicar (no está en la última versión),
/// y `false` si está completamente actualizada.
/// Espera como mínimo 1 segundo antes de devolver el resultado.
#[tauri::command]
pub async fn has_migrations_pending(app: AppHandle) -> CommandResponse<bool> {
    let deadline = Instant::now() + Duration::from_secs(1);

    let (pool, path) = match open_pool(&app).await {
        Ok((p, path)) => (p, path),
        Err(e) => {
            sleep_until(deadline).await;
            return CommandResponse::err(
                "tauri.migrations.errors.connection_failed",
                params!("reason" => e),
            );
        }
    };

    let mut conn = match pool.acquire().await {
        Ok(c) => c,
        Err(e) => {
            pool.close().await;
            sleep_until(deadline).await;
            return CommandResponse::err(
                "tauri.migrations.errors.connection_failed",
                params!("path" => path, "reason" => e.to_string()),
            );
        }
    };

    // Asegurarse de que la tabla de control '_sqlx_migrations' existe en la DB
    if let Err(e) = conn.ensure_migrations_table().await {
        pool.close().await;
        sleep_until(deadline).await;
        return CommandResponse::err(
            "tauri.migrations.errors.migration_failed",
            params!("reason" => e.to_string()),
        );
    }

    // Obtener la lista de las migraciones ya aplicadas en la base de datos
    let applied_migrations = match conn.list_applied_migrations().await {
        Ok(am) => am,
        Err(e) => {
            pool.close().await;
            sleep_until(deadline).await;
            return CommandResponse::err(
                "tauri.migrations.errors.migration_failed",
                params!("reason" => e.to_string()),
            );
        }
    };

    // Obtener las migraciones definidas en el código (las locales en tu carpeta)
    let migrator = sqlx::migrate!();

    // Comparar: si alguna migración local no está en la lista de aplicadas, hay pendientes
    let has_pending = migrator.migrations.iter().any(|local_migration| {
        !applied_migrations
            .iter()
            .any(|applied| applied.version == local_migration.version)
    });

    let _ = conn.close().await;
    pool.close().await;
    sleep_until(deadline).await;

    CommandResponse::ok(has_pending, "tauri.migrations.success.checked")
}
