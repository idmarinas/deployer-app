use super::get_database_path_internal;
use crate::response::CommandResponse;
use tauri::AppHandle;

/// Comprueba si el archivo .sqlite guardado en el store existe físicamente en disco.
#[tauri::command]
pub fn check_database_exists(app: AppHandle) -> CommandResponse<bool> {
    match get_database_path_internal(app) {
        Ok(None) => CommandResponse::ok(false, "tauri.store.success.database_not_configured"),
        Ok(Some(p)) => {
            let exists = std::path::Path::new(&p).exists();
            CommandResponse::ok(exists, "tauri.store.success.checked_existence")
        }
        Err(e) => {
            let mut params = std::collections::HashMap::new();
            params.insert("reason".to_string(), e);
            CommandResponse::err("tauri.store.errors.check_failed", params)
        }
    }
}
