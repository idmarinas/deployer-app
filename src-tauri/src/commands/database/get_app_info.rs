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
    pub copyright: String,
    pub publisher: String,
    pub tauri_version: String,
    pub vue_version: String,
    pub nuxt_ui_version: String,
    pub platform: String,
    pub architecture: String,
}

/// Devuelve información detallada de la aplicación: nombre, versión, identificador,
/// copyright, publicador, versión de Tauri, de Vue y de Nuxt UI, plataforma y arquitectura.
#[tauri::command]
pub fn get_app_info(app: AppHandle) -> CommandResponse<AppInfo> {
    let info = app.package_info();
    let config = app.config();

    CommandResponse::ok(
        AppInfo {
            name: info.name.clone(),
            version: info.version.to_string(),
            identifier: config.identifier.clone(),
            copyright: "Copyright (c) 2026 IDMarinas".to_string(),
            publisher: "IDMarinas".to_string(),
            tauri_version: tauri::VERSION.to_string(),
            vue_version: env!("DEPLOYER_VUE_VERSION").to_string(),
            nuxt_ui_version: env!("DEPLOYER_NUXT_UI_VERSION").to_string(),
            platform: std::env::consts::OS.to_string(),
            architecture: std::env::consts::ARCH.to_string(),
        },
        "tauri.database.success.app_info",
    )
}
