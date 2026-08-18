pub mod cache;
pub mod database;
pub mod hosts;
pub mod passkeys;
pub mod projects;
pub mod remote;

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
