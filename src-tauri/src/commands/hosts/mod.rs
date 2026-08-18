pub mod status;
pub mod test_connection;
pub mod types;
pub mod updates;

// Re-exportar otros comandos
pub use status::{host_check_system_info, host_check_metrics};
pub use test_connection::test_connection;
pub use updates::{host_check_updates, host_update_packages};
