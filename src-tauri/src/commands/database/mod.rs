pub mod create_database_file;
pub mod get_app_info;
pub mod get_database_info;
pub mod get_database_url;
pub mod get_migrations_info;
pub mod has_pending_migrations;
pub mod initialize_database;
pub mod query_raw;
pub mod run_migrations;
pub mod store;
pub mod validate_sqlite_database;

// Re-exportar comandos
pub use create_database_file::create_database_file;
pub use get_app_info::get_app_info;
pub use get_database_info::get_database_info;
pub use get_database_url::get_database_url;
pub use get_migrations_info::get_migrations_info;
pub use has_pending_migrations::has_pending_migrations;
pub use initialize_database::initialize_database;
pub use query_raw::query_raw;
pub use run_migrations::run_migrations;
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
