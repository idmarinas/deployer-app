mod commands;
mod crypto;
mod helpers;
mod patch;
mod response;
mod ssh;

use commands::database::{
    create_database_file, get_app_info, get_database_info,
    get_migrations_info, has_migrations_pending, initialize_database, query_raw,
    execute_migrations, validate_database_sqlite,
};
use commands::database::store::{check_database_exists, get_database_path, set_database_path};
use commands::projects::docker::compose::{
    sync_project_docker_compose_files,
    project_docker_compose_down, project_docker_compose_logs, project_docker_compose_ps,
    project_docker_compose_pull, project_docker_compose_restart, project_docker_compose_up,
};
use commands::cache::docker::{
    cache_docker_search, cache_docker_tags,
};
use commands::hosts::{
    host_check_system_info, host_check_metrics, host_check_updates, host_update_packages, test_connection,
};
use commands::passkeys::{
    derive_passkey_info, export_public_key, generate_passkey,
};
use commands::remote::{
    ssh_cancel_remote_job, ssh_download_file, ssh_execute_command, ssh_upload_file,
    RemoteJobCancel,
};


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
            // Docker Composes - Archivos
            sync_project_docker_compose_files,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
