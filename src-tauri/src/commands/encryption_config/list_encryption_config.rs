use std::collections::HashMap;
use std::collections::HashSet;
use tauri::AppHandle;
use sqlx::Row;

use crate::commands::encryption_config::types::EncryptionConfig;
use crate::commands::helpers::open_pool;
use crate::commands::CommandResponse;

/// Columnas del sistema que se excluyen automáticamente de la configuración
/// (ID primario, claves foráneas * _id, y timestamps de auditoría).
const SYS_COLUMNS: &[&str] = &["id", "created_at", "updated_at", "started_at", "finished_at", "enabled"];

/// Tablas internas que se excluyen de la configuración.
const EXCLUDED_TABLES: &[&str] = &[
    "_sqlx_migrations",
    "deployer_settings",
    "encryption_config",
    "task_dependencies",
    "global_variables",      // cifrado propio vía is_secret
    "framework_configs",     // cifrado propio vía is_secret
    "project_variables",     // cifrado propio vía is_secret
];

/// Pares (tabla, campo) que tienen cifrado estático `#[db_encrypt]`.
const STATIC_ENCRYPT_FIELDS: &[(&str, &str)] = &[
    ("hosts", "password"),
    ("passkeys", "key_content"),
    ("passkeys", "passphrase"),
];

/// Pares (tabla, campo) con exposición estática `#[db_encrypt(expose = true)]`.
/// Si un campo está en `STATIC_ENCRYPT_FIELDS` pero no aquí, su `static_expose` es `false`.
const STATIC_EXPOSE_FIELDS: &[(&str, &str)] = &[
    // ("hosts", "password"),       // expose = false
    // ("passkeys", "key_content"), // expose = false
    // ("passkeys", "passphrase"),  // expose = false
];

#[tauri::command]
pub async fn list_encryption_config(
    app: AppHandle,
) -> Result<CommandResponse<Vec<EncryptionConfig>>, String> {
    let (pool, _) = match open_pool(&app).await {
        Ok(p) => p,
        Err(e) => {
            return Ok(CommandResponse::err(
                "encryption_config.errors.context_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    // 1. Obtener todas las tablas de usuario
    let table_rows = sqlx::query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Error al listar tablas: {}", e))?;

    let excluded: HashSet<&str> = EXCLUDED_TABLES.iter().copied().collect();
    let tables: Vec<String> = table_rows
        .iter()
        .filter_map(|row| {
            let name: String = row.get("name");
            if excluded.contains(name.as_str()) { None } else { Some(name) }
        })
        .collect();

    // 2. Cargar configuración existente de encryption_config
    let existing_config: HashMap<(String, String), (bool, bool)> = {
        let rows = sqlx::query("SELECT table_name, field_name, encrypt, expose FROM encryption_config")
            .fetch_all(&pool)
            .await
            .map_err(|e| format!("Error al leer encryption_config: {}", e))?;

        rows.iter().map(|r| {
            let table: String = r.get("table_name");
            let field: String = r.get("field_name");
            let encrypt: bool = r.get("encrypt");
            let expose: bool = r.get("expose");
            ((table, field), (encrypt, expose))
        }).collect()
    };

    // 3. Construir sets de búsqueda rápida para campos estáticos
    let static_encrypt_set: HashSet<(&str, &str)> = STATIC_ENCRYPT_FIELDS.iter().copied().collect();
    let static_expose_set: HashSet<(&str, &str)> = STATIC_EXPOSE_FIELDS.iter().copied().collect();
    let sys_columns_set: HashSet<&str> = SYS_COLUMNS.iter().copied().collect();

    let mut result = Vec::new();

    for table_name in &tables {
        // 4. Obtener columnas de cada tabla vía PRAGMA
        let col_rows = sqlx::query(&format!("PRAGMA table_info(\"{}\")", table_name))
            .fetch_all(&pool)
            .await
            .map_err(|e| format!("Error al leer columnas de {}: {}", table_name, e))?;

        for col_row in &col_rows {
            let field_name: String = col_row.get("name");

            // 5. Filtrar columnas del sistema: IDs y timestamps
            if sys_columns_set.contains(field_name.as_str()) || field_name.ends_with("_id") {
                continue;
            }

            let (db_encrypt, db_expose) = existing_config
                .get(&(table_name.clone(), field_name.clone()))
                .copied()
                .unwrap_or((false, false));

            let is_static = static_encrypt_set.contains(&(table_name.as_str(), field_name.as_str()));

            let is_static_expose = static_expose_set.contains(&(table_name.as_str(), field_name.as_str()));

            result.push(EncryptionConfig {
                table_name: table_name.clone(),
                field_name,
                encrypt: db_encrypt,
                expose: db_expose,
                static_encrypt: is_static,
                static_expose: is_static_expose,
                static_encrypt_conditional: false,
            });
        }
    }

    Ok(CommandResponse::ok(result, "encryption_config.success.listed"))
}
