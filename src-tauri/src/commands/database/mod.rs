pub mod create_database_file;
pub mod get_app_info;
pub mod get_database_info;
pub mod get_migrations_info;
pub mod has_migrations_pending;
pub mod initialize_database;
pub mod query_raw;
pub mod execute_migrations;
pub mod store;
pub mod validate_database_sqlite;

// Re-exportar comandos
pub use create_database_file::create_database_file;
pub use get_app_info::get_app_info;
pub use get_database_info::get_database_info;
pub use get_migrations_info::get_migrations_info;
pub use has_migrations_pending::has_migrations_pending;
pub use initialize_database::initialize_database;
pub use query_raw::query_raw;
pub use execute_migrations::execute_migrations;
pub use validate_database_sqlite::validate_database_sqlite;

// Utilidades compartidas
pub fn path_to_sqlite_url(path: &str) -> String {
    let normalized = path.replace('\\', "/");
    format!("sqlite:///{}", normalized)
}


