use tauri::AppHandle;
use crate::commands::store::get_database_path_internal;
use crate::commands::CommandResponse;
use super::path_to_plugin_sql_url;

/// Devuelve la URI SQLite lista para usar en el frontend (plugin-sql).
#[tauri::command]
pub fn get_database_url(app: AppHandle) -> CommandResponse<Option<String>> {
    match get_database_path_internal(app) {
        Ok(path) => {
            let url = path.map(|p| path_to_plugin_sql_url(&p));
            CommandResponse::ok(url, "database.success.url_retrieved")
        }
        Err(e) => {
            let mut params = std::collections::HashMap::new();
            params.insert("reason".to_string(), e);
            CommandResponse::err("database.errors.store_error", params)
        }
    }
}
