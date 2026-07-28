use serde::{Deserialize, Deserializer};
use serde_json::Value;
use ts_rs::{Config, TypeVisitor, TS};

/// Representa los 3 estados posibles de un campo `NULL`-able en un update
/// parcial (`UpdateXInput`), distinguiendo "no enviado" de "enviado como null":
///
/// - `Unset`:    la clave no vino en el JSON      → no se toca el campo actual en BD.
/// - `Null`:     vino explícitamente como `null`  → se borra el campo (`NULL` en BD).
/// - `Value(T)`: vino con un valor                → se actualiza el campo con ese valor.
///
/// # Uso en un `UpdateXInput`
///
/// ```rust,ignore
/// #[derive(Debug, Deserialize, TS)]
/// pub struct UpdateProjectInput {
///     pub name: Option<String>,           // campo NOT NULL → Option simple basta
///     #[serde(default)]
///     #[ts(optional = nullable)]
///     pub description: Patch<String>,     // campo NULLABLE → necesita Patch
/// }
/// ```
///
/// `#[serde(default)]` es imprescindible: hace que, si la clave no aparece en el
/// JSON, el campo se rellene con `Patch::Unset` (vía `Default`) SIN invocar al
/// `Deserialize` de `Patch`. Si la clave sí aparece (con valor o con `null`), serde
/// sí invoca `Patch::deserialize`, que nunca devuelve `Unset`.
///
/// `#[ts(optional = nullable)]` genera en TypeScript `campo?: T | null` en vez de
/// envolver `Patch<T>` como un tipo propio.
#[derive(Debug, Clone)]
pub enum Patch<T> {
    Unset,
    Null,
    Value(T),
}

impl<T> Default for Patch<T> {
    fn default() -> Self {
        Patch::Unset
    }
}

impl<'de, T: Deserialize<'de>> Deserialize<'de> for Patch<T> {
    fn deserialize<D>(de: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        // Esta función solo se invoca cuando la clave SÍ está presente en el JSON
        // (gracias a `#[serde(default)]` en el campo); por eso nunca debe devolver
        // `Unset` aquí, solo `Null` (si el JSON trae `null`) o `Value(v)`.
        Ok(match Option::<T>::deserialize(de)? {
            Some(v) => Patch::Value(v),
            None => Patch::Null,
        })
    }
}

impl<T> Patch<T> {
    /// Fusiona este patch con el valor actual en BD (utilidad disponible para
    /// casos en los que se necesite reconstruir la entidad completa en memoria;
    /// los comandos `crud_update_*` no la necesitan, usan `to_field_value`).
    #[allow(dead_code)]
    pub fn merge(self, current: Option<T>) -> Option<T> {
        match self {
            Patch::Unset => current,
            Patch::Null => None,
            Patch::Value(v) => Some(v),
        }
    }

    /// Devuelve `Some(serde_json::Value)` si el campo debe incluirse en el `UPDATE`
    /// dinámico (vino en el JSON, con valor o como `null`), o `None` si no se tocó
    /// (`Unset`), en cuyo caso el campo se omite por completo de la query SQL.
    pub fn to_field_value(&self) -> Option<Value>
    where
        T: serde::Serialize,
    {
        match self {
            Patch::Unset => None,
            Patch::Null => Some(Value::Null),
            Patch::Value(v) => Some(serde_json::to_value(v).unwrap_or(Value::Null)),
        }
    }
}

/// Representación en TypeScript: idéntica a `Option<T>` (`T | null`).
/// Requiere `#[ts(optional = nullable)]` en el campo para que la clave del
/// objeto TS sea opcional; sin esa anotación, `T | null` se generaría como
/// tipo obligatorio (no podrías omitir la clave desde el frontend).
impl<T: TS> TS for Patch<T> {
    type WithoutGenerics = Self;
    type OptionInnerType = Self;

    fn name(cfg: &Config) -> String {
        format!("{} | null", T::name(cfg))
    }

    fn inline(cfg: &Config) -> String {
        format!("{} | null", T::inline(cfg))
    }

    fn visit_dependencies(v: &mut impl TypeVisitor)
    where
        Self: 'static,
    {
        <T as TS>::visit_dependencies(v);
    }

    fn visit_generics(v: &mut impl TypeVisitor)
    where
        Self: 'static,
    {
        <T as TS>::visit_generics(v);
        v.visit::<T>();
    }
}
