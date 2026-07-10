pub mod cipher;
pub mod keyring;

pub use cipher::{decrypt, encrypt, is_encrypted};
pub use keyring::get_or_create_master_key;

/// Valor centinela que reemplaza a los datos cifrados cuando se envían al
/// frontend. El frontend reconoce este prefijo y muestra un placeholder
/// (ej. "••••••••") en lugar del valor real.
pub const BLANK_VALUE: &str = "__BLANK__e5362baf-c777-4d57-a609-6eaf1f9e87f6";

/// Comprueba si un valor es el centinela de campo cifrado.
#[allow(dead_code)]
pub fn is_blank_value(value: &str) -> bool {
    value.starts_with("__BLANK__")
}
