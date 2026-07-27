pub mod crud;
pub mod status;
pub mod test_connection;
pub mod types;
pub mod updates;

// Re-exportar comandos CRUD
pub use crud::{
    crud_create_host, crud_delete_host, crud_get_host, crud_list_hosts, crud_update_host,
};

// Re-exportar otros comandos
pub use status::{host_check_system_info, host_check_metrics};
pub use test_connection::test_connection;
pub use updates::{host_check_updates, host_update_packages};
