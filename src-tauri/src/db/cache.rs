use sqlx::{Row, SqlitePool};
use std::collections::HashMap;
use tokio::sync::RwLock;

/// Configuración de cifrado para un campo concreto, leída de `encryption_config`.
#[derive(Debug, Clone)]
pub struct FieldEncryptionConfig {
    pub encrypt: bool,
    pub expose: bool,
}

/// Clave de la caché: (nombre_tabla, nombre_campo)
type CacheKey = (String, String);

/// Estado global de la caché de configuración de cifrado.
/// Se registra con `.manage()` en Tauri y se inyecta como `State`.
pub struct EncryptionConfigCache {
    cache: RwLock<Option<HashMap<CacheKey, FieldEncryptionConfig>>>,
}

impl EncryptionConfigCache {
    pub fn new() -> Self {
        Self {
            cache: RwLock::new(None),
        }
    }

    /// Devuelve la configuración de cifrado para todos los campos.
    /// Si la caché está vacía, la carga desde SQLite y la almacena.
    pub async fn get(
        &self,
        pool: &SqlitePool,
    ) -> Result<HashMap<CacheKey, FieldEncryptionConfig>, String> {
        // Lectura rápida: si ya está cargada, devolver directamente
        {
            let read = self.cache.read().await;
            if let Some(ref cached) = *read {
                return Ok(cached.clone());
            }
        }

        // No está en caché: cargar desde SQLite
        let rows = sqlx::query(
            "SELECT table_name, field_name, encrypt, expose FROM encryption_config",
        )
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error al leer encryption_config: {}", e))?;

        let mut map = HashMap::new();
        for row in rows {
            let table: String = row.get("table_name");
            let field: String = row.get("field_name");
            let encrypt: bool = row.get("encrypt");
            let expose: bool = row.get("expose");
            map.insert((table, field), FieldEncryptionConfig { encrypt, expose });
        }

        // Guardar en caché
        let mut write = self.cache.write().await;
        *write = Some(map.clone());

        Ok(map)
    }

    /// Obtiene la configuración de un campo concreto.
    /// Usado por comandos que gestionan `encryption_config` (futuros).
    #[allow(dead_code)]
    pub async fn get_field(
        &self,
        pool: &SqlitePool,
        table: &str,
        field: &str,
    ) -> Result<Option<FieldEncryptionConfig>, String> {
        let map = self.get(pool).await?;
        Ok(map.get(&(table.to_string(), field.to_string())).cloned())
    }

    /// Invalida la caché. La próxima llamada a `get()` recargará desde SQLite.
    /// Debe llamarse tras cualquier cambio en la tabla `encryption_config`.
    #[allow(dead_code)]
    pub async fn invalidate(&self) {
        let mut write = self.cache.write().await;
        *write = None;
    }
}
