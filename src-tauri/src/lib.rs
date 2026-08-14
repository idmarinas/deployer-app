mod commands;
mod crypto;
mod crud;
mod description;
mod helpers;
mod macros;
mod patch;
mod response;
mod ssh;

use commands::database::{
    create_database_file, get_app_info, get_database_info,
    get_migrations_info, has_migrations_pending, initialize_database, query_raw,
    execute_migrations, validate_database_sqlite,
};
use commands::database::store::{check_database_exists, get_database_path, set_database_path};
use commands::deployer_settings::{
    delete_deployer_setting, get_deployer_setting, list_deployer_settings, set_deployer_setting,
    set_deployer_settings,
};
use commands::deployments::{
    crud_create_deployment, crud_delete_deployment, crud_get_deployment, crud_list_deployments,
    crud_update_deployment,
    crud_create_deployment_execution, crud_delete_deployment_execution,
    crud_get_deployment_execution, crud_list_deployment_executions,
    crud_update_deployment_execution,
    crud_create_deployment_rollback, crud_delete_deployment_rollback,
    crud_get_deployment_rollback, crud_list_deployment_rollbacks,
    crud_update_deployment_rollback,
    run_deployment,
};
use commands::docker::compose::{
    crud_create_docker_compose, crud_delete_docker_compose, crud_get_docker_compose,
    crud_list_docker_composes, crud_update_docker_compose, sync_docker_compose_files,
    docker_compose_down, docker_compose_logs, docker_compose_ps, docker_compose_pull,
    docker_compose_restart, docker_compose_up,
};
use commands::docker::hub_cache::{
    get_docker_hub_search_cache, get_docker_hub_tags_cache, cleanup_docker_hub_cache,
};
use commands::global_variables::{
    crud_create_global_variable, crud_delete_global_variable, crud_get_global_variable,
    crud_list_global_variables, crud_update_global_variable,
};
use commands::hosts::{
    crud_create_host, crud_delete_host, crud_get_host, crud_list_hosts, crud_update_host,
    host_check_system_info, host_check_metrics, host_check_updates, host_update_packages, test_connection,
};
use commands::passkeys::{
    crud_create_passkey, crud_delete_passkey, crud_get_passkey, crud_list_passkeys,
    crud_update_passkey, export_public_key, generate_passkey,
};
use commands::remote::{
    ssh_cancel_remote_job, ssh_download_file, ssh_execute_command, ssh_upload_file,
    RemoteJobCancel,
};
use commands::projects::{
    crud_create_project, crud_delete_project, crud_get_project, crud_list_projects,
    crud_update_project,
    crud_create_framework_config, crud_delete_framework_config, crud_get_framework_config,
    crud_list_framework_configs, crud_update_framework_config,
    crud_create_project_host, crud_delete_project_host, crud_get_project_host,
    crud_list_project_hosts, crud_update_project_host,
    crud_create_project_task, crud_delete_project_task, crud_get_project_task,
    crud_list_project_tasks, crud_update_project_task,
    crud_create_project_variable, crud_delete_project_variable, crud_get_project_variable,
    crud_list_project_variables, crud_update_project_variable,
};
use commands::tasks::{
    crud_create_task, crud_delete_task, crud_get_task, crud_list_tasks, crud_update_task,
    crud_create_task_dependency, crud_delete_task_dependency, crud_get_task_dependency,
    crud_list_task_dependencies, crud_update_task_dependency,
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
            // Hosts - CRUD
            crud_create_host,
            crud_update_host,
            crud_get_host,
            crud_list_hosts,
            crud_delete_host,
            // Hosts - otros
            test_connection,
            host_check_system_info,
            host_check_metrics,
            host_check_updates,
            host_update_packages,
            // Passkeys - CRUD
            crud_create_passkey,
            crud_update_passkey,
            crud_get_passkey,
            crud_list_passkeys,
            crud_delete_passkey,
            // Passkeys - otros
            export_public_key,
            generate_passkey,
            // Consola remota
            ssh_execute_command,
            ssh_upload_file,
            ssh_download_file,
            ssh_cancel_remote_job,
            // Projects - CRUD
            crud_create_project,
            crud_update_project,
            crud_get_project,
            crud_list_projects,
            crud_delete_project,
            // Projects > Framework Configs - CRUD
            crud_create_framework_config,
            crud_update_framework_config,
            crud_get_framework_config,
            crud_list_framework_configs,
            crud_delete_framework_config,
            // Projects > Hosts - CRUD
            crud_create_project_host,
            crud_update_project_host,
            crud_get_project_host,
            crud_list_project_hosts,
            crud_delete_project_host,
            // Projects > Tasks - CRUD
            crud_create_project_task,
            crud_update_project_task,
            crud_get_project_task,
            crud_list_project_tasks,
            crud_delete_project_task,
            // Projects > Variables - CRUD
            crud_create_project_variable,
            crud_update_project_variable,
            crud_get_project_variable,
            crud_list_project_variables,
            crud_delete_project_variable,
            // Deployer Settings
            get_deployer_setting,
            set_deployer_setting,
            set_deployer_settings,
            list_deployer_settings,
            delete_deployer_setting,
            // Deployments - CRUD
            crud_create_deployment,
            crud_update_deployment,
            crud_get_deployment,
            crud_list_deployments,
            crud_delete_deployment,
            // Deployments > Executions - CRUD
            crud_create_deployment_execution,
            crud_update_deployment_execution,
            crud_get_deployment_execution,
            crud_list_deployment_executions,
            crud_delete_deployment_execution,
            // Deployments > Rollbacks - CRUD
            crud_create_deployment_rollback,
            crud_update_deployment_rollback,
            crud_get_deployment_rollback,
            crud_list_deployment_rollbacks,
            crud_delete_deployment_rollback,
            // Deployments - Runner
            run_deployment,
            // Global Variables - CRUD
            crud_create_global_variable,
            crud_update_global_variable,
            crud_get_global_variable,
            crud_list_global_variables,
            crud_delete_global_variable,
            // Docker Composes - CRUD
            crud_create_docker_compose,
            crud_update_docker_compose,
            crud_get_docker_compose,
            crud_list_docker_composes,
            crud_delete_docker_compose,
            // Docker Composes - Archivos
            sync_docker_compose_files,
            // Docker Composes - Operaciones
            docker_compose_up,
            docker_compose_down,
            docker_compose_ps,
            docker_compose_logs,
            docker_compose_restart,
            docker_compose_pull,
            // Docker Hub Cache
            get_docker_hub_search_cache,
            get_docker_hub_tags_cache,
            cleanup_docker_hub_cache,
            // Tasks - CRUD
            crud_create_task,
            crud_update_task,
            crud_get_task,
            crud_list_tasks,
            crud_delete_task,
            // Tasks > Dependencies - CRUD
            crud_create_task_dependency,
            crud_update_task_dependency,
            crud_get_task_dependency,
            crud_list_task_dependencies,
            crud_delete_task_dependency,
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
