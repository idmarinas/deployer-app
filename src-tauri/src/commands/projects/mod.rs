pub mod crud;
pub mod framework_configs;
pub mod hosts;
pub mod tasks;
pub mod types;
pub mod variables;

pub use crud::{
    crud_create_project, crud_delete_project, crud_get_project, crud_list_projects,
    crud_update_project,
};
pub use framework_configs::{
    crud_create_framework_config, crud_delete_framework_config, crud_get_framework_config,
    crud_list_framework_configs, crud_update_framework_config,
};
pub use hosts::{
    crud_create_project_host, crud_delete_project_host, crud_get_project_host,
    crud_list_project_hosts, crud_update_project_host,
};
pub use tasks::{
    crud_create_project_task, crud_delete_project_task, crud_get_project_task,
    crud_list_project_tasks, crud_update_project_task,
};
pub use variables::{
    crud_create_project_variable, crud_delete_project_variable, crud_get_project_variable,
    crud_list_project_variables, crud_update_project_variable,
};
