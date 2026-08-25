pub mod cipher;
pub mod keyring;

pub use cipher::{decrypt, is_encrypted};
pub use keyring::get_or_create_master_key;

/// Valor centinela que el backend sustituye por los valores con prefijo `ENC:`
/// cuando el frontend solicita enmascaramiento (`mask_fields`). El frontend
/// reconoce este valor y muestra un placeholder (ej. "••••••••") en UI.
pub const BLANK_VALUE: &str = "__BLANK__e5362baf-c777-4d57-a609-6eaf1f9e87f6";
