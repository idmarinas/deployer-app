use super::{DB_PATH_KEY, STORE_FILE};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

/// Helper interno de Rust para obtener la ruta de la base de datos.
pub fn get_database_path_internal(app: AppHandle) -> Result<Option<String>, String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Error al abrir el store: {}", e))?;

    let path = store
        .get(DB_PATH_KEY)
        .and_then(|v| v.as_str().map(|s| s.to_string()));

    Ok(path)
}
