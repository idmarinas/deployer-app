use crate::crypto::{self, VaultHealthReport};
use tauri::AppHandle;

/// Devuelve la password del vault de Stronghold (la crea y la guarda en el
/// keychain del SO en la primera ejecución). El frontend la usa con el plugin
/// de Stronghold para abrir el vault.
#[tauri::command]
pub fn get_vault_password() -> Result<String, String> {
    crypto::get_or_create_vault_password()
}

/// Devuelve la ruta absoluta del archivo de vault de Stronghold.
/// El frontend la usa con el plugin de Stronghold para abrir el vault.
#[tauri::command]
pub fn get_vault_path(app: AppHandle) -> Result<String, String> {
    use tauri::Manager;
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Error al obtener directorio de datos: {}", e))?;
    let vault_path = data_dir.join("vault.hold");
    vault_path
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Ruta del vault no es UTF-8 válida".to_string())
}

/// Diagnóstico del estado del vault de Stronghold.
/// Devuelve si el archivo existe, si el snapshot carga y qué claves hay.
#[tauri::command]
pub fn check_vault_health(app: AppHandle) -> VaultHealthReport {
    crypto::StrongholdVault::health_check(&app)
}