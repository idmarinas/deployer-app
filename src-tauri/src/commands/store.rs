use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "app_config.json";
const DB_PATH_KEY: &str = "database_path";

/// Obtiene la ruta del archivo .sqlite guardada en el store.
/// Devuelve None si no está configurada.
#[tauri::command]
pub fn get_database_path(app: AppHandle) -> Result<Option<String>, String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Error al abrir el store: {}", e))?;

    let path = store
        .get(DB_PATH_KEY)
        .and_then(|v| v.as_str().map(|s| s.to_string()));

    Ok(path)
}

/// Guarda la ruta del archivo .sqlite en el store.
#[tauri::command]
pub fn set_database_path(app: AppHandle, path: String) -> Result<(), String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Error al abrir el store: {}", e))?;

    store
        .set(DB_PATH_KEY, serde_json::Value::String(path));

    store
        .save()
        .map_err(|e| format!("Error al guardar el store: {}", e))?;

    Ok(())
}

/// Comprueba si el archivo .sqlite guardado en el store existe físicamente en disco.
#[tauri::command]
pub fn check_database_exists(app: AppHandle) -> Result<bool, String> {
    let path = get_database_path(app)?;

    match path {
        None => Ok(false),
        Some(p) => Ok(std::path::Path::new(&p).exists()),
    }
}
