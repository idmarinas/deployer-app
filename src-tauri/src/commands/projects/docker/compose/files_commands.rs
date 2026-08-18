use std::collections::HashMap;
use tauri::AppHandle;
use sqlx::Row;

use crate::commands::projects::docker::compose::files_types::{
    DockerComposeFile, SyncDockerComposeFilesInput,
};
use crate::helpers::open_crypto_context;
use crate::response::CommandResponse;

// ============================================================================
// Comandos Tauri
// ============================================================================

/// Sincroniza la lista de archivos de un compose en una única transacción:
/// inserta los nuevos, actualiza los existentes y elimina los que ya no
/// estén presentes. Devuelve la lista final de archivos con sus ids.
#[tauri::command]
pub async fn sync_project_docker_compose_files(
    app: AppHandle,
    input: SyncDockerComposeFilesInput,
) -> Result<CommandResponse<Vec<DockerComposeFile>>, String> {
    let (pool, _key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.docker_composes.files.sync_failed",
                HashMap::from([("reason".to_string(), e)]),
            ))
        }
    };

    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.docker_composes.files.sync_failed",
                HashMap::from([("reason".to_string(), e.to_string())]),
            ))
        }
    };

    let mut submitted_ids: Vec<i64> = Vec::new();

    for file in &input.files {
        if file.file_path.trim().is_empty() {
            continue;
        }

        let result = match file.id {
            Some(id) => {
                let result = sqlx::query(
                    "UPDATE deployer_docker_compose_files SET file_path = ?1, content = ?2, is_binary = ?3, name = ?4, mime_type = ?5, size = ?6, last_modified = ?7, webkit_relative_path = ?8, icon = ?9 WHERE id = ?10 AND module_id = ?11"
                )
                .bind(&file.file_path)
                .bind(&file.content)
                .bind(file.is_binary)
                .bind(&file.name)
                .bind(&file.mime_type)
                .bind(file.size)
                .bind(file.last_modified)
                .bind(&file.webkit_relative_path)
                .bind(&file.icon)
                .bind(id)
                .bind(input.module_id)
                .execute(&mut *tx)
                .await;

                match result {
                    Ok(r) if r.rows_affected() > 0 => Ok(id),
                    Ok(_) => {
                        // El id no pertenecía a este compose: se inserta.
                        sqlx::query(
                            "INSERT INTO deployer_docker_compose_files (module_id, file_path, content, is_binary, name, mime_type, size, last_modified, webkit_relative_path, icon) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"
                        )
                        .bind(input.module_id)
                        .bind(&file.file_path)
                        .bind(&file.content)
                        .bind(file.is_binary)
                        .bind(&file.name)
                        .bind(&file.mime_type)
                        .bind(file.size)
                        .bind(file.last_modified)
                        .bind(&file.webkit_relative_path)
                        .bind(&file.icon)
                        .execute(&mut *tx)
                        .await
                        .map(|r| r.last_insert_rowid() as i64)
                    }
                    Err(e) => Err(e),
                }
            }
            None => {
                sqlx::query(
                    "INSERT INTO deployer_docker_compose_files (module_id, file_path, content, is_binary, name, mime_type, size, last_modified, webkit_relative_path, icon) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"
                )
                .bind(input.module_id)
                .bind(&file.file_path)
                .bind(&file.content)
                .bind(file.is_binary)
                .bind(&file.name)
                .bind(&file.mime_type)
                .bind(file.size)
                .bind(file.last_modified)
                .bind(&file.webkit_relative_path)
                .bind(&file.icon)
                .execute(&mut *tx)
                .await
                .map(|r| r.last_insert_rowid() as i64)
            }
        };

        match result {
            Ok(id) => submitted_ids.push(id),
            Err(e) => {
                let _ = tx.rollback().await;
                return Ok(CommandResponse::err(
                    "tauri.docker_composes.files.sync_failed",
                    HashMap::from([("reason".to_string(), e.to_string())]),
                ));
            }
        }
    }

    let mut delete_sql =
        String::from("DELETE FROM deployer_docker_compose_files WHERE module_id = ?1");
    if !submitted_ids.is_empty() {
        let placeholders = submitted_ids
            .iter()
            .map(|_| "?")
            .collect::<Vec<_>>()
            .join(", ");
        delete_sql.push_str(&format!(" AND id NOT IN ({})", placeholders));
    }

    let mut delete_query = sqlx::query(&delete_sql).bind(input.module_id);
    for id in &submitted_ids {
        delete_query = delete_query.bind(id);
    }

    if let Err(e) = delete_query.execute(&mut *tx).await {
        let _ = tx.rollback().await;
        return Ok(CommandResponse::err(
            "tauri.docker_composes.files.sync_failed",
            HashMap::from([("reason".to_string(), e.to_string())]),
        ));
    }

    if let Err(e) = tx.commit().await {
        return Ok(CommandResponse::err(
            "tauri.docker_composes.files.sync_failed",
            HashMap::from([("reason".to_string(), e.to_string())]),
        ));
    }

    let rows = sqlx::query(
        "SELECT * FROM deployer_docker_compose_files WHERE module_id = ?1 ORDER BY id ASC",
    )
    .bind(input.module_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Error al cargar archivos sincronizados: {}", e))?;

    let files = rows
        .iter()
        .map(|row| DockerComposeFile {
            id: row.get("id"),
            module_id: row.get("module_id"),
            file_path: row.get("file_path"),
            content: row.get("content"),
            is_binary: row.get("is_binary"),
            name: row.get("name"),
            mime_type: row.get("mime_type"),
            size: row.get("size"),
            last_modified: row.get("last_modified"),
            webkit_relative_path: row.get("webkit_relative_path"),
            icon: row.get("icon"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
        .collect::<Vec<_>>();

    Ok(CommandResponse::ok(
        files,
        "tauri.docker_composes.files.sync.success",
    ))
}