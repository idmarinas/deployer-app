mod commands;
mod crypto;
mod files;
mod helpers;
mod patch;
mod response;
mod ssh;
pub mod tables;

use commands::cache::docker::{cache_docker_search, cache_docker_tags};
use commands::database::store::{check_database_exists, get_database_path, set_database_path};
use commands::database::{
    create_database_file, execute_migrations, get_app_info, get_database_info, get_migrations_info,
    has_migrations_pending, initialize_database, query_raw, validate_database_sqlite,
};
use commands::hosts::{
    host_check_metrics, host_check_system_info, host_check_updates, host_update_packages,
    test_connection,
};
use commands::passkeys::{derive_passkey_info, export_public_key, generate_passkey};
use commands::projects::docker::compose::{
    project_docker_compose_down, project_docker_compose_logs, project_docker_compose_ps,
    project_docker_compose_pull, project_docker_compose_restart, project_docker_compose_up,
};
use commands::projects::files::sync_module_files;
use commands::remote::{
    ssh_cancel_remote_job, ssh_download_file, ssh_execute_command, ssh_upload_file, RemoteJobCancel,
};
use commands::stronghold::{
    get_vault_password, get_vault_path, rotate_encryption_key, scan_and_reencrypt,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_opener::init())
        .manage(RemoteJobCancel::default())
        .setup(|app| {
            #[cfg(desktop)]
            {
                tauri::tray::TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .on_tray_icon_event(|tray_handle, event| {
                        tauri_plugin_positioner::on_tray_event(tray_handle.app_handle(), &event);
                    })
                    .build(app)?;
            }

            // Stronghold: se registra en setup para tener acceso a app_local_data_dir
            let salt_path = app
                .path()
                .app_local_data_dir()
                .expect("could not resolve app local data path")
                .join("salt.txt");
            app.handle()
                .plugin(tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build())?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Hosts - non-CRUD
            test_connection,
            host_check_system_info,
            host_check_metrics,
            host_check_updates,
            host_update_packages,
            // Passkeys - non-CRUD
            derive_passkey_info,
            export_public_key,
            generate_passkey,
            // Consola remota
            ssh_execute_command,
            ssh_upload_file,
            ssh_download_file,
            ssh_cancel_remote_job,
            // Modules - Archivos (genérico, patrón "_files")
            sync_module_files,
            // Docker Composes - Operaciones
            project_docker_compose_up,
            project_docker_compose_down,
            project_docker_compose_ps,
            project_docker_compose_logs,
            project_docker_compose_restart,
            project_docker_compose_pull,
            // Docker Hub Cache
            cache_docker_search,
            cache_docker_tags,
            // Database - Store
            get_database_path,
            set_database_path,
            check_database_exists,
            // Database
            initialize_database,
            create_database_file,
            validate_database_sqlite,
            query_raw,
            get_app_info,
            get_database_info,
            get_migrations_info,
            // Database - Migrations
            execute_migrations,
            has_migrations_pending,
            // Stronghold
            get_vault_password,
            get_vault_path,
            rotate_encryption_key,
            scan_and_reencrypt,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
