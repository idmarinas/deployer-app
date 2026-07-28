use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::str::FromStr;
use tauri::AppHandle;

use crate::commands::database::path_to_sqlite_url;
use crate::commands::database::store::get_database_path_internal;
use crate::crypto;

pub fn configured_sqlite_options(url: &str) -> Result<SqliteConnectOptions, String> {
    SqliteConnectOptions::from_str(url)
        .map_err(|e| e.to_string())
        .map(|o| o.foreign_keys(true))
}

pub async fn create_configured_pool(url: &str) -> Result<SqlitePool, String> {
    let options = configured_sqlite_options(url)?;
    SqlitePool::connect_with(options)
        .await
        .map_err(|e| e.to_string())
}

pub async fn open_pool(app: &AppHandle) -> Result<(SqlitePool, String), String> {
    let path = get_database_path_internal(app.clone())
        .map_err(|e| e)?
        .ok_or_else(|| "No se ha configurado la ruta de la base de datos".to_string())?;

    let url = path_to_sqlite_url(&path);
    let pool = create_configured_pool(&url).await?;

    Ok((pool, path))
}

pub fn get_master_key() -> Result<Vec<u8>, String> {
    crypto::get_or_create_master_key()
}

pub async fn open_crypto_context(
    app: &AppHandle,
) -> Result<(SqlitePool, Vec<u8>), String> {
    let (pool, _) = open_pool(app).await?;
    let key = get_master_key()?;
    Ok((pool, key))
}
