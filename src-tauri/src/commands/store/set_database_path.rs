use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use crate::commands::CommandResponse;
use super::{STORE_FILE, DB_PATH_KEY};

/// Guarda la ruta del archivo .sqlite en el store.
#[tauri::command]
pub fn set_database_path(app: AppHandle, path: String) -> CommandResponse<()> {
    let store = match app.store(STORE_FILE) {
        Ok(s) => s,
        Err(e) => {
            let mut params = std::collections::HashMap::new();
            params.insert("reason".to_string(), e.to_string());
            return CommandResponse::err("store.errors.open_failed", params);
        }
    };

    store.set(DB_PATH_KEY, serde_json::Value::String(path));

    if let Err(e) = store.save() {
        let mut params = std::collections::HashMap::new();
        params.insert("reason".to_string(), e.to_string());
        return CommandResponse::err("store.errors.save_failed", params);
    }

    CommandResponse::ok_empty("store.success.set_path")
}
