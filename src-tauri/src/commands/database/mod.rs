// Macro params! - Debe declararse antes de los submódulos para que esté disponible en ellos
macro_rules! params {
    ($($k:expr => $v:expr),*) => {{
        let mut m = std::collections::HashMap::new();
        $(m.insert($k.to_string(), $v.to_string());)*
        m
    }};
}

pub mod create_database_file;
pub mod get_database_url;
pub mod initialize_database;
pub mod validate_sqlite_database;

// Re-exportar comandos
pub use create_database_file::create_database_file;
pub use get_database_url::get_database_url;
pub use initialize_database::initialize_database;
pub use validate_sqlite_database::validate_sqlite_database;

// Utilidades compartidas
pub fn path_to_sqlite_url(path: &str) -> String {
    let normalized = path.replace('\\', "/");
    format!("sqlite:///{}", normalized)
}

pub fn path_to_plugin_sql_url(path: &str) -> String {
    let normalized = path.replace('\\', "/");
    format!("sqlite:{}", normalized)
}
