use sqlx::Row;

use crate::crypto;
use crate::helpers::open_pool;

#[tauri::command]
pub fn get_vault_password() -> Result<String, String> {
    crypto::get_or_create_vault_password()
}

#[tauri::command]
pub fn get_vault_path(app: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Error al obtener directorio de datos: {}", e))?;
    let vault_path = data_dir.join("vault.hold");
    vault_path
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Ruta del vault no es UTF-8 válida".to_string())
}

#[tauri::command]
pub fn rotate_encryption_key(scope: String) -> Result<Vec<u8>, String> {
    let vault = crypto::StrongholdVault::open()?;
    vault.rotate_key(&scope)
}

/// Campos cifrados indexados por el sistema. Cada entrada describe la tabla,
/// la columna PK y la columna cifrada. `scope` es el identificador base
/// (`encrypt:{table}.{column}`, p.ej. `encrypt:deployer_hosts.password`)
/// usado como clave en Stronghold.
struct EncryptedField {
    table: &'static str,
    pk: &'static str,
    column: &'static str,
    scope: &'static str,
}

const ENCRYPTED_FIELDS: &[EncryptedField] = &[
    EncryptedField {
        table: "deployer_hosts",
        pk: "id",
        column: "password",
        scope: "encrypt:deployer_hosts.password",
    },
    EncryptedField {
        table: "deployer_passkeys",
        pk: "id",
        column: "key_content",
        scope: "encrypt:deployer_passkeys.key_content",
    },
    EncryptedField {
        table: "deployer_passkeys",
        pk: "id",
        column: "passphrase",
        scope: "encrypt:deployer_passkeys.passphrase",
    },
];

/// Resultado del escaneo y re-cifrado.
#[derive(serde::Serialize)]
pub struct ScanReencryptResult {
    /// Valores re-cifrados (filas actualizadas).
    reencrypted: u64,
    /// Versiones de clave eliminadas por ser obsoletas (sin valores que las usen).
    purged_versions: Vec<String>,
    /// Total de claves viejas restantes todavía en uso.
    versions_in_use: usize,
}

/// Recorre todos los valores cifrados en SQLite, re-cifra los que usan una
/// versión de clave anterior a la actual y, al terminar, elimina las versiones
/// de clave antiguas que ya no tenga ninguno en uso.
#[tauri::command]
pub async fn scan_and_reencrypt(app: tauri::AppHandle) -> Result<ScanReencryptResult, String> {
    let vault = crypto::StrongholdVault::open()?;
    let (pool, _path) = open_pool(&app).await?;

    let mut reencrypted = 0u64;
    // versiones aún en uso por campo: (scope, version)
    let mut used: Vec<(String, i64)> = Vec::new();
    let mut updates: Vec<(String, i64, String)> = Vec::new(); // (update_sql, param, pk)

    for field in ENCRYPTED_FIELDS {
        let current_version = vault.get_current_version(field.scope)?;
        let sql = format!(
            "SELECT \"{}\", \"{}\" FROM \"{}\"",
            field.pk, field.column, field.table
        );
        let rows = sqlx::query(&sql)
            .fetch_all(&pool)
            .await
            .map_err(|e| format!("Error al leer {}: {}", field.table, e))?;

        for row in rows {
            let pk: i64 = row
                .try_get(field.pk)
                .map_err(|e| format!("Error al leer pk en {}: {}", field.table, e))?;
            let value: Option<String> = row.try_get(field.column).ok().flatten();

            let Some(value) = value else { continue };
            if !value.starts_with("ENC:") {
                continue;
            }

            let (version, _payload) = crate::crypto::split_ciphertext_version(&value);
            used.push((field.scope.to_string(), version));

            if version != current_version {
                let plaintext = vault.decrypt_value(field.scope, &value)?;
                let current_key = vault.get_key_for_version(field.scope, current_version)?;
                let encrypted = crate::crypto::encrypt_with_key(&plaintext, &current_key, current_version)?;
                let update_sql = format!(
                    "UPDATE \"{}\" SET \"{}\" = ? WHERE \"{}\" = ?",
                    field.table, field.column, field.pk
                );
                updates.push((update_sql, pk, encrypted));
            }
        }
    }

    for (update_sql, pk, encrypted) in &updates {
        sqlx::query(update_sql)
            .bind(encrypted)
            .bind(pk)
            .execute(&pool)
            .await
            .map_err(|e| format!("Error al actualizar valor re-cifrado: {}", e))?;
        reencrypted += 1;
    }

    // Purgar versiones antiguas sin uso.
    let mut purged_versions: Vec<String> = Vec::new();
    for field in ENCRYPTED_FIELDS {
        let current_version = vault.get_current_version(field.scope)?;
        for version in 0..current_version {
            let still_used = used
                .iter()
                .any(|(s, v)| s == field.scope && *v == version);
            // Eliminar únicamente versiones > 0 (la 0 es base inicial).
            if !still_used && version > 0 {
                vault.purge_version(field.scope, version)?;
                purged_versions.push(format!("{} (v{})", field.scope, version));
            }
        }
    }

    vault.save()?;

    let versions_in_use = used
        .iter()
        .filter(|(_, v)| *v > 0)
        .count();

    Ok(ScanReencryptResult {
        reencrypted,
        purged_versions,
        versions_in_use,
    })
}
