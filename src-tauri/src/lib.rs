mod commands;

use commands::hosts::test_connection;
use commands::database::{
    create_database_file, get_database_url, initialize_database, validate_sqlite_database,
};
use commands::migrations::{has_pending_migrations, run_migrations};
use commands::store::{check_database_exists, get_database_path, set_database_path};

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
            // Hosts
            test_connection,
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
