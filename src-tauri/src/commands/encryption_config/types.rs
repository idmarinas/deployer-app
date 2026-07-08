use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct EncryptionConfig {
    pub table_name: String,
    pub field_name: String,
    /// Valor actual de `encrypt` en la tabla `encryption_config` (o false si no existe fila).
    pub encrypt: bool,
    /// Valor actual de `expose` en la tabla `encryption_config` (o false si no existe fila).
    pub expose: bool,
    /// El campo tiene cifrado estático vía proc-macro `#[db_encrypt]` — no se puede desactivar.
    pub static_encrypt: bool,
    /// El campo tiene exposición estática vía proc-macro `#[db_encrypt(expose = …)]`.
    pub static_expose: bool,
    /// El campo tiene cifrado condicional vía `#[db_conditional_encrypt]`.
    pub static_encrypt_conditional: bool,
}
