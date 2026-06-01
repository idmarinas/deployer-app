use serde::Serialize;
use sqlx::sqlite::SqliteRow;

/// Trait que debe implementar cada entidad que use el sistema CRUD genérico.
///
/// # Implementar para una nueva entidad
///
/// 1. Implementar `table_name()` con el nombre exacto de la tabla en SQLite.
/// 2. Implementar `from_row()` para construir la entidad desde una fila de SQLite.
/// 3. Implementar `to_fields()` para serializar la entidad a pares clave-valor.
/// 4. Opcionalmente, sobrescribir `encrypted_fields()` con los campos sensibles.
/// 5. Opcionalmente, sobrescribir `conditional_encrypted_fields()` para campos
///    cuyo cifrado depende del valor de otro campo (ej: `value` si `is_secret = true`).
///
/// # Ejemplo
///
/// ```rust
/// impl DbEntity for Host {
///     fn table_name() -> &'static str { "hosts" }
///
///     fn encrypted_fields() -> &'static [(&'static str, bool)] {
///         &[("password", false)]
///     }
///
///     fn from_row(row: &SqliteRow) -> Result<Self, String> { ... }
///     fn to_fields(&self) -> Vec<(String, serde_json::Value)> { ... }
/// }
/// ```
pub trait DbEntity: Sized + Serialize + Send + Unpin {
    /// Nombre de la tabla en SQLite.
    fn table_name() -> &'static str;

    /// Campos que siempre se cifran al guardar.
    ///
    /// Cada entrada es `(nombre_campo, expose)`:
    /// - `expose = true`  → se descifra al leer y se envía en texto plano al frontend.
    /// - `expose = false` → se devuelve cifrado tal cual (el frontend no lo necesita legible).
    ///
    /// Por defecto ningún campo se cifra.
    fn encrypted_fields() -> &'static [(&'static str, bool)] {
        &[]
    }

    /// Campos cuyo cifrado depende del valor de otro campo booleano en la misma fila.
    ///
    /// Cada entrada es `(campo_valor, campo_condicion)`:
    /// - Se cifra `campo_valor` solo si `campo_condicion` es `true` en esa fila.
    ///
    /// Ejemplo: `("value", "is_secret")` → cifra `value` solo si `is_secret = 1`.
    ///
    /// Por defecto no hay campos condicionales.
    fn conditional_encrypted_fields() -> &'static [(&'static str, &'static str)] {
        &[]
    }

    /// Construye la entidad desde una fila de SQLite.
    fn from_row(row: &SqliteRow) -> Result<Self, String>;

    /// Serializa la entidad a pares `(nombre_campo, valor)` para INSERT/UPDATE.
    /// No debe incluir el campo `id`.
    fn to_fields(&self) -> Vec<(String, serde_json::Value)>;

    /// Reconstruye la entidad desde un mapa de pares `(nombre_campo, valor)`.
    /// Se usa tras aplicar descifrado para actualizar los campos en memoria.
    fn from_fields(fields: Vec<(String, serde_json::Value)>) -> Result<Self, String>;
}
