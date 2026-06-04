use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::str::FromStr;
use tauri::AppHandle;

use crate::commands::database::path_to_sqlite_url;
use crate::commands::store::get_database_path_internal;
use crate::crypto;
use crate::db::EncryptionConfigCache;

/// Obtiene la ruta de la BD desde el store y crea un pool de conexiones SQLite.
pub async fn open_pool(app: &AppHandle) -> Result<(SqlitePool, String), String> {
    let path = get_database_path_internal(app.clone())
        .map_err(|e| e)?
        .ok_or_else(|| "No se ha configurado la ruta de la base de datos".to_string())?;

    let url = path_to_sqlite_url(&path);
    let options = SqliteConnectOptions::from_str(&url).map_err(|e| e.to_string())?;
    let pool = SqlitePool::connect_with(options)
        .await
        .map_err(|e| e.to_string())?;

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
