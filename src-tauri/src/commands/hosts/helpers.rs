// El contexto de cifrado es compartido entre todos los módulos de comandos.
// Re-exportamos desde commands::helpers para no duplicar código.
pub use crate::commands::helpers::open_crypto_context;
