use crate::response::CommandResponse;
use serde::Serialize;
use tauri::AppHandle;
use ts_rs::TS;

#[derive(Serialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub identifier: String,
    pub description: String,
    pub copyright: String,
    pub publisher: String,
    pub tauri_version: String,
    pub platform: String,
    pub architecture: String,
}

/// Devuelve información detallada de la aplicación: nombre, versión, identificador,
/// descripción, copyright, publicador, versión de Tauri, plataforma y arquitectura.
#[tauri::command]
pub fn get_app_info(app: AppHandle) -> CommandResponse<AppInfo> {
    let info = app.package_info();
    let config = app.config();

    CommandResponse::ok(
        AppInfo {
            name: info.name.clone(),
            version: info.version.to_string(),
            identifier: config.identifier.clone(),
            description: "Gestiona y automatiza despliegues de aplicaciones web en servidores remotos mediante tareas, claves SSH y variables configurables.".to_string(),
            copyright: "Copyright (c) 2026 IDMarinas".to_string(),
            publisher: "IDMarinas".to_string(),
            tauri_version: tauri::VERSION.to_string(),
            platform: std::env::consts::OS.to_string(),
            architecture: std::env::consts::ARCH.to_string(),
        },
        "database.success.app_info",
    )
}
