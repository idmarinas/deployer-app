use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::str::FromStr;
use tauri::AppHandle;

use crate::commands::database::path_to_sqlite_url;
use crate::commands::store::get_database_path_internal;
use crate::crypto;
use crate::db::EncryptionConfigCache;

/// Configuración base compartida para todas las conexiones SQLite del proyecto.
/// Aplica `PRAGMA foreign_keys = ON` y cualquier otra opción global futura.
/// Usa esta función siempre que necesites crear un `SqliteConnectOptions`.
pub fn configured_sqlite_options(url: &str) -> Result<SqliteConnectOptions, String> {
    SqliteConnectOptions::from_str(url)
        .map_err(|e| e.to_string())
        .map(|o| o.foreign_keys(true))
}

/// Crea un pool SQLite con la configuración estándar del proyecto.
/// Todas las conexiones del pool tienen `PRAGMA foreign_keys = ON`.
/// Para opciones adicionales (ej. `.read_only(true)`), usa
/// `configured_sqlite_options` y luego `SqlitePool::connect_with`.
pub async fn create_configured_pool(url: &str) -> Result<SqlitePool, String> {
    let options = configured_sqlite_options(url)?;
    SqlitePool::connect_with(options)
        .await
        .map_err(|e| e.to_string())
}

/// Obtiene la ruta de la BD desde el store y crea un pool de conexiones SQLite.
pub async fn open_pool(app: &AppHandle) -> Result<(SqlitePool, String), String> {
    let path = get_database_path_internal(app.clone())
        .map_err(|e| e)?
        .ok_or_else(|| "No se ha configurado la ruta de la base de datos".to_string())?;

    let url = path_to_sqlite_url(&path);
    let pool = create_configured_pool(&url).await?;

    Ok((pool, path))
}

/// Obtiene la clave maestra de cifrado desde el keychain del SO.
pub fn get_master_key() -> Result<Vec<u8>, String> {
    crypto::get_or_create_master_key()
}

/// Agrupa las tres dependencias necesarias para operaciones con cifrado:
/// pool de SQLite, caché de configuración de cifrado y clave maestra.
///
/// Usado por todos los módulos de comandos que gestionan entidades con campos cifrados.
pub async fn open_crypto_context<'a>(
    app: &AppHandle,
    cache: &'a EncryptionConfigCache,
) -> Result<(SqlitePool, &'a EncryptionConfigCache, Vec<u8>), String> {
    let (pool, _) = open_pool(app).await?;
    let key = get_master_key()?;
    Ok((pool, cache, key))
}
