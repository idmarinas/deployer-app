use std::collections::HashMap;
use tauri::AppHandle;

use crate::commands::projects::files::types::SyncModuleFilesInput;
use crate::files::{self, ModuleFile};
use crate::helpers::open_pool;
use crate::response::CommandResponse;

// ============================================================================
// Comando Tauri genérico de archivos de módulo
// ============================================================================

/// Sincroniza la lista de archivos de un módulo en una única transacción:
/// inserta los nuevos, actualiza los existentes y elimina los que ya no estén
/// presentes. Devuelve la lista final de archivos con sus ids.
///
/// Es un comando genérico compatible con cualquier tabla con patrón "_files":
/// el frontend indica la `table` (identificador de [`crate::files::FilesTable`])
/// y el `module_id` del padre. Por defecto usa la tabla de Docker Compose.
///
/// El SQL se construye dinámicamente a partir del schema `_files` (crate::files),
/// de modo que si cambia una columna basta con regenerar `files.rs`
/// (bun run tables:generate).
#[tauri::command]
pub async fn sync_module_files(
    app: AppHandle,
    input: SyncModuleFilesInput,
) -> Result<CommandResponse<Vec<ModuleFile>>, String> {
    // La exaustividad de tabla queda garantizada en compile-time por el enum.
    let schema = input.table.schema();

    // Columnas editables, excluyendo la FK (module_id), que se gestiona aparte.
    let edit_cols: Vec<&str> = files::FILES_EDITABLE
        .iter()
        .copied()
        .filter(|c| *c != schema.fk)
        .collect();

    let edit_sql_cols = edit_cols.join(", ");

    let (pool, _path) = match open_pool(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.files.sync_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.files.sync_failed",
                HashMap::from([("reason".to_string(), e.to_string())]),
            ))
        }
    };

    let mut submitted_ids: Vec<i64> = Vec::new();

    for file in &input.files {
        if file.file_path.trim().is_empty() {
            continue;
        }

        // Los timestamps se gestionan aquí (formato RFC3339 = new Date().toISOString()).
        // En INSERT se fijan created_at y updated_at; en UPDATE solo updated_at.
        let now = chrono::Utc::now().to_rfc3339();

        let result = match file.id {
            Some(id) => {
                // UPDATE ... SET col1 = ?, ..., colN = ?, updated_at = ? WHERE id = ? AND fk = ?
                let mut update_set = edit_cols
                    .iter()
                    .map(|col| format!("{} = ?", col))
                    .collect::<Vec<_>>();
                update_set.push("updated_at = ?".to_string());

                let sql = format!(
                    "UPDATE {} SET {} WHERE id = ? AND {} = ?",
                    schema.table,
                    update_set.join(", "),
                    schema.fk
                );

                let mut q = sqlx::query(&sql);
                q = q
                    .bind(&file.file_path)
                    .bind(&file.content)
                    .bind(file.is_binary)
                    .bind(&file.name)
                    .bind(&file.mime_type)
                    .bind(&file.file_type)
                    .bind(file.size)
                    .bind(file.last_modified)
                    .bind(&file.webkit_relative_path)
                    .bind(&file.icon)
                    .bind(&now)
                    .bind(id)
                    .bind(input.module_id);

                match q.execute(&mut *tx).await {
                    Ok(r) if r.rows_affected() > 0 => Ok(id),
                    Ok(_) => {
                        // El id no pertenecía a este módulo: se inserta.
                        let placeholders =
                            std::iter::repeat_n("?", edit_cols.len() + 3).collect::<Vec<_>>().join(", ");

                        let sql = format!(
                            "INSERT INTO {} ({}, {}, created_at, updated_at) VALUES ({})",
                            schema.table, schema.fk, edit_sql_cols, placeholders
                        );

                        let mut q = sqlx::query(&sql);
                        q = q
                            .bind(input.module_id)
                            .bind(&file.file_path)
                            .bind(&file.content)
                            .bind(file.is_binary)
                            .bind(&file.name)
                            .bind(&file.mime_type)
                            .bind(&file.file_type)
                            .bind(file.size)
                            .bind(file.last_modified)
                            .bind(&file.webkit_relative_path)
                            .bind(&file.icon)
                            .bind(&now)
                            .bind(&now);

                        q.execute(&mut *tx)
                            .await
                            .map(|r| r.last_insert_rowid() as i64)
                    }
                    Err(e) => Err(e),
                }
            }
            None => {
                let placeholders =
                    std::iter::repeat_n("?", edit_cols.len() + 3).collect::<Vec<_>>().join(", ");

                let sql = format!(
                    "INSERT INTO {} ({}, {}, created_at, updated_at) VALUES ({})",
                    schema.table, schema.fk, edit_sql_cols, placeholders
                );

                let mut q = sqlx::query(&sql);
                q = q
                    .bind(input.module_id)
                    .bind(&file.file_path)
                    .bind(&file.content)
                    .bind(file.is_binary)
                    .bind(&file.name)
                    .bind(&file.mime_type)
                    .bind(&file.file_type)
                    .bind(file.size)
                    .bind(file.last_modified)
                    .bind(&file.webkit_relative_path)
                    .bind(&file.icon)
                    .bind(&now)
                    .bind(&now);

                q.execute(&mut *tx)
                    .await
                    .map(|r| r.last_insert_rowid() as i64)
            }
        };

        match result {
            Ok(id) => submitted_ids.push(id),
            Err(e) => {
                let _ = tx.rollback().await;
                return Ok(CommandResponse::err(
                    "tauri.files.sync_failed",
                    HashMap::from([("reason".to_string(), e.to_string())]),
                ));
            }
        }
    }

    let mut delete_sql = format!("DELETE FROM {} WHERE {} = ?", schema.table, schema.fk);
    if !submitted_ids.is_empty() {
        let placeholders = submitted_ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
        delete_sql.push_str(&format!(" AND id NOT IN ({})", placeholders));
    }

    let mut delete_query = sqlx::query(&delete_sql).bind(input.module_id);
    for id in &submitted_ids {
        delete_query = delete_query.bind(id);
    }

    if let Err(e) = delete_query.execute(&mut *tx).await {
        let _ = tx.rollback().await;
        return Ok(CommandResponse::err(
            "tauri.files.sync_failed",
            HashMap::from([("reason".to_string(), e.to_string())]),
        ));
    }

    if let Err(e) = tx.commit().await {
        return Ok(CommandResponse::err(
            "tauri.files.sync_failed",
            HashMap::from([("reason".to_string(), e.to_string())]),
        ));
    }

    let files = sqlx::query_as::<_, ModuleFile>(&format!(
        "SELECT * FROM {} WHERE {} = ? ORDER BY id ASC",
        schema.table, schema.fk
    ))
    .bind(input.module_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Error al cargar archivos sincronizados: {}", e))?;

    Ok(CommandResponse::ok(files, "tauri.files.sync_success"))
}
