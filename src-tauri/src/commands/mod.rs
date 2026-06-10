pub mod database;
pub mod deployment_executions;
pub mod deployment_rollbacks;
pub mod deployments;
pub mod deployer_settings;
pub mod framework_configs;
pub mod global_variables;
pub mod helpers;
pub mod hosts;
pub mod migrations;
pub mod passkeys;
pub mod project_hosts;
pub mod project_tasks;
pub mod project_variables;
pub mod projects;
pub mod response;
pub mod store;
pub mod task_dependencies;
pub mod tasks;

pub use response::CommandResponse;

/// Macro params! global - disponible en todos los módulos de commands.
/// Construye un HashMap<String, String> de forma concisa.
#[macro_export]
macro_rules! params {
    () => {
        std::collections::HashMap::<String, String>::new()
    };
    ($($k:expr => $v:expr),+ $(,)?) => {{
        let mut m = std::collections::HashMap::new();
        $(m.insert($k.to_string(), $v.to_string());)+
        m
    }};
}
