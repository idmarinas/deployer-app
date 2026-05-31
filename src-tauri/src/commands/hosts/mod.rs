// Macro params! - Disponible en todos los submódulos de hosts
macro_rules! params {
    ($($k:expr => $v:expr),*) => {{
        let mut m = std::collections::HashMap::new();
        $(m.insert($k.to_string(), $v.to_string());)*
        m
    }};
}

pub mod test_connection;

// Re-exportar comandos
pub use test_connection::test_connection;
