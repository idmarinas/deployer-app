pub mod check_database_exists;
pub mod get_database_path;
pub mod set_database_path;

pub use check_database_exists::check_database_exists;
pub use get_database_path::{get_database_path, get_database_path_internal};
pub use set_database_path::set_database_path;

pub const STORE_FILE: &str = "app_config.json";
pub const DB_PATH_KEY: &str = "database_path";
