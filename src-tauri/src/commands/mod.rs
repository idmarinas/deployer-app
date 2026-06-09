pub mod database;
pub mod helpers;
pub mod hosts;
pub mod migrations;
pub mod passkeys;
pub mod projects;
pub mod response;
pub mod store;

pub use response::CommandResponse;

/// Macro params! global - disponible en todos los módulos de commands.
/// Construye un HashMap<String, String> de forma concisa.
#[macro_export]
macro_rules! params {
    ($($k:expr => $v:expr),*) => {{
        let mut m = std::collections::HashMap::new();
        $(m.insert($k.to_string(), $v.to_string());)*
        m
    }};
}
