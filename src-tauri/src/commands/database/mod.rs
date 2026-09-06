pub mod get_app_info;
pub mod get_database_info;
pub mod helpers;
pub mod manage;
pub mod migrations;
pub mod query_raw;
pub mod store;

// Re-exportar comandos
pub use get_app_info::get_app_info;
pub use get_database_info::get_database_info;
pub use query_raw::query_raw;

// Utilidades compartidas
pub fn path_to_sqlite_url(path: &str) -> String {
    let normalized = path.replace('\\', "/");
    format!("sqlite:///{}", normalized)
}
