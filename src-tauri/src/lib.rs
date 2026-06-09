mod commands;
mod crypto;
mod db;

use commands::database::{
    create_database_file, get_database_url, initialize_database, validate_sqlite_database,
};
use commands::hosts::{
    crud_create_host, crud_delete_host, crud_get_host, crud_list_hosts, crud_update_host,
    test_connection,
};
use commands::migrations::{has_pending_migrations, run_migrations};
use commands::passkeys::{
    crud_create_passkey, crud_delete_passkey, crud_get_passkey, crud_list_passkeys,
    crud_update_passkey, export_public_key, generate_passkey,
};
use commands::projects::{
    crud_create_project, crud_delete_project, crud_get_project, crud_list_projects,
    crud_update_project,
};
use commands::store::{check_database_exists, get_database_path, set_database_path};
use db::EncryptionConfigCache;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_opener::init())
        // Caché de configuración de cifrado (estado global compartido)
        .manage(EncryptionConfigCache::new())
        .setup(|app| {
            #[cfg(desktop)]
            {
                tauri::tray::TrayIconBuilder::new()
                    .on_tray_icon_event(|tray_handle, event| {
                        tauri_plugin_positioner::on_tray_event(tray_handle.app_handle(), &event);
                    })
                    .build(app)?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Hosts - CRUD
            crud_create_host,
            crud_update_host,
            crud_get_host,
            crud_list_hosts,
            crud_delete_host,
            // Hosts - otros
            test_connection,
            // Passkeys - CRUD
            crud_create_passkey,
            crud_update_passkey,
            crud_get_passkey,
            crud_list_passkeys,
            crud_delete_passkey,
            // Passkeys - otros
            export_public_key,
            generate_passkey,
            // Projects - CRUD
            crud_create_project,
            crud_update_project,
            crud_get_project,
            crud_list_projects,
            crud_delete_project,
            // Store
            get_database_path,
            set_database_path,
            check_database_exists,
            // Database
            get_database_url,
            initialize_database,
            create_database_file,
            validate_sqlite_database,
            // Migrations
            run_migrations,
            has_pending_migrations,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
