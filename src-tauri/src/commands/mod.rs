pub mod database;
pub mod deployer_settings;
pub mod deployments;
pub mod description;
pub mod docker_composes;
pub mod docker_hub_cache;
pub mod global_variables;
pub mod helpers;
pub mod hosts;
pub mod macros;
pub mod migrations;
pub mod passkeys;
pub mod patch;
pub mod projects;
pub mod response;
pub mod store;
pub mod tasks;

pub use patch::Patch;
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
