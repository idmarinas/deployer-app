/// Prefijo que identifica valores cifrados en SQLite.
const ENCRYPTED_PREFIX: &str = "ENC:";

/// Indica si un valor ya está cifrado.
pub fn is_encrypted(value: &str) -> bool {
    value.starts_with(ENCRYPTED_PREFIX)
}
