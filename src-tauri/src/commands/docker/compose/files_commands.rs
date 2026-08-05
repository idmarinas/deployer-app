use std::collections::HashMap;
use tauri::AppHandle;
use sqlx::Row;

use crate::commands::docker::compose::files_types::{
    DockerComposeFile, DeleteDockerComposeFileInput, SyncDockerComposeFilesInput,
    UploadComposeFilesInput,
};
use crate::helpers::open_crypto_context;
use crate::response::CommandResponse;

// ============================================================================
// Comandos Tauri
// ============================================================================

/// Lee archivos seleccionados del PC y los registra en la base de datos.
/// El contenido se almacena para luego ser subido al servidor en el despliegue.
#[tauri::command]
pub async fn upload_compose_files(
    app: AppHandle,
    input: UploadComposeFilesInput,
) -> Result<CommandResponse<Vec<DockerComposeFile>>, String> {
    let (pool, _key) = open_crypto_context(&app).await?;

    let mut uploaded_files = Vec::new();

    for file_path in &input.file_paths {
        let local_path = std::path::Path::new(file_path);
        let file_name = local_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(file_path);

        let content_bytes = tokio::fs::read(local_path)
            .await
            .map_err(|e| format!("Error al leer '{}': {}", file_path, e))?;

        let is_binary = std::str::from_utf8(&content_bytes).is_err();

        let content = if is_binary {
            None
        } else {
            Some(String::from_utf8_lossy(&content_bytes).to_string())
        };

        let metadata = tokio::fs::metadata(local_path)
            .await
            .ok()
            .map(|m| {
                serde_json::json!({
                    "size": m.len(),
                    "lastModified": m.modified().ok().map(|t| t.duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)),
                })
                .to_string()
            });

        let result = sqlx::query(
            "INSERT INTO deployer_docker_compose_files (docker_compose_id, file_path, content, is_binary, metadata) VALUES (?1, ?2, ?3, ?4, ?5)"
        )
        .bind(input.docker_compose_id)
        .bind(file_name)
        .bind(&content)
        .bind(is_binary)
        .bind(&metadata)
        .execute(&pool)
        .await
        .map_err(|e| format!("Error al guardar registro del archivo: {}", e))?;

        uploaded_files.push(DockerComposeFile {
            id: result.last_insert_rowid() as i64,
            docker_compose_id: input.docker_compose_id,
            file_path: file_name.to_string(),
            content,
            is_binary,
            metadata,
            created_at: String::new(),
            updated_at: String::new(),
        });
    }

    Ok(CommandResponse::ok(
        uploaded_files,
        "tauri.docker_composes.files.upload.success",
    ))
}

/// Crea un archivo en la app (contenido en texto).
#[tauri::command]
pub async fn create_compose_file(
    app: AppHandle,
    input: crate::commands::docker::compose::files_types::CreateDockerComposeFileInput,
) -> Result<CommandResponse<DockerComposeFile>, String> {
    let (pool, _key) = open_crypto_context(&app).await?;

    let file = input.into_docker_compose_file();

    sqlx::query(
        "INSERT INTO deployer_docker_compose_files (docker_compose_id, file_path, content, is_binary, metadata) VALUES (?1, ?2, ?3, ?4, ?5)"
    )
    .bind(file.docker_compose_id)
    .bind(&file.file_path)
    .bind(&file.content)
    .bind(file.is_binary)
    .bind(&file.metadata)
    .execute(&pool)
    .await
    .map_err(|e| format!("Error al crear archivo: {}", e))?;

    Ok(CommandResponse::ok(
        file,
        "tauri.docker_composes.files.create.success",
    ))
}

/// Elimina un archivo de la base de datos.
#[tauri::command]
pub async fn delete_compose_file(
    app: AppHandle,
    input: DeleteDockerComposeFileInput,
) -> Result<CommandResponse<()>, String> {
    let (pool, _key) = open_crypto_context(&app).await?;

    sqlx::query("DELETE FROM deployer_docker_compose_files WHERE id = ?1")
        .bind(input.id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Error al eliminar archivo: {}", e))?;

    Ok(CommandResponse::ok(
        (),
        "tauri.docker_composes.files.delete.success",
    ))
}

/// Actualiza el contenido de un archivo.
#[tauri::command]
pub async fn update_compose_file(
    app: AppHandle,
    input: crate::commands::docker::compose::files_types::UpdateDockerComposeFileInput,
) -> Result<CommandResponse<DockerComposeFile>, String> {
    let (pool, _key) = open_crypto_context(&app).await?;

    let _ = sqlx::query("SELECT * FROM deployer_docker_compose_files WHERE id = ?1")
        .bind(input.id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| format!("Error al cargar archivo: {}", e))?
        .ok_or_else(|| "Archivo no encontrado".to_string())?;

    let mut fields: Vec<(String, serde_json::Value)> = Vec::new();

    if let Some(ref path) = input.file_path {
        fields.push(("file_path".to_string(), serde_json::Value::String(path.clone())));
    }
    if let Some(v) = input.content.to_field_value() {
        fields.push(("content".to_string(), v));
    }
    if let Some(is_binary) = input.is_binary {
        fields.push(("is_binary".to_string(), serde_json::Value::Bool(is_binary)));
    }
    if let Some(v) = input.metadata.to_field_value() {
        fields.push(("metadata".to_string(), v));
    }

    if !fields.is_empty() {
        let set_clause: String = fields
            .iter()
            .map(|(k, _)| format!("{} = ?", k))
            .collect::<Vec<_>>()
            .join(", ");

        let query = format!(
            "UPDATE deployer_docker_compose_files SET {} WHERE id = ?",
            set_clause
        );

        let mut q = sqlx::query(&query);
        for (_, v) in &fields {
            q = q.bind(v);
        }
        q = q.bind(input.id);

        q.execute(&pool)
            .await
            .map_err(|e| format!("Error al actualizar archivo: {}", e))?;
    }

    let updated = sqlx::query("SELECT * FROM deployer_docker_compose_files WHERE id = ?1")
        .bind(input.id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| format!("Error al cargar archivo actualizado: {}", e))?
        .ok_or_else(|| "Archivo no encontrado tras actualizar".to_string())?;

    let file = DockerComposeFile {
        id: updated.get("id"),
        docker_compose_id: updated.get("docker_compose_id"),
        file_path: updated.get("file_path"),
        content: updated.get("content"),
        is_binary: updated.get("is_binary"),
        metadata: updated.get("metadata"),
        created_at: updated.get("created_at"),
        updated_at: updated.get("updated_at"),
    };

    Ok(CommandResponse::ok(
        file,
        "tauri.docker_composes.files.update.success",
    ))
}

/// Sincroniza la lista de archivos de un compose en una única transacción:
/// inserta los nuevos, actualiza los existentes y elimina los que ya no
/// estén presentes. Devuelve la lista final de archivos con sus ids.
#[tauri::command]
pub async fn sync_docker_compose_files(
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
                    "UPDATE deployer_docker_compose_files SET file_path = ?1, content = ?2, is_binary = ?3, metadata = ?4 WHERE id = ?5 AND docker_compose_id = ?6"
                )
                .bind(&file.file_path)
                .bind(&file.content)
                .bind(file.is_binary)
                .bind(&file.metadata)
                .bind(id)
                .bind(input.docker_compose_id)
                .execute(&mut *tx)
                .await;

                match result {
                    Ok(r) if r.rows_affected() > 0 => Ok(id),
                    Ok(_) => {
                        // El id no pertenecía a este compose: se inserta.
                        sqlx::query(
                            "INSERT INTO deployer_docker_compose_files (docker_compose_id, file_path, content, is_binary, metadata) VALUES (?1, ?2, ?3, ?4, ?5)"
                        )
                        .bind(input.docker_compose_id)
                        .bind(&file.file_path)
                        .bind(&file.content)
                        .bind(file.is_binary)
                        .bind(&file.metadata)
                        .execute(&mut *tx)
                        .await
                        .map(|r| r.last_insert_rowid() as i64)
                    }
                    Err(e) => Err(e),
                }
            }
            None => {
                sqlx::query(
                    "INSERT INTO deployer_docker_compose_files (docker_compose_id, file_path, content, is_binary, metadata) VALUES (?1, ?2, ?3, ?4, ?5)"
                )
                .bind(input.docker_compose_id)
                .bind(&file.file_path)
                .bind(&file.content)
                .bind(file.is_binary)
                .bind(&file.metadata)
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
        String::from("DELETE FROM deployer_docker_compose_files WHERE docker_compose_id = ?1");
    if !submitted_ids.is_empty() {
        let placeholders = submitted_ids
            .iter()
            .map(|_| "?")
            .collect::<Vec<_>>()
            .join(", ");
        delete_sql.push_str(&format!(" AND id NOT IN ({})", placeholders));
    }

    let mut delete_query = sqlx::query(&delete_sql).bind(input.docker_compose_id);
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
        "SELECT * FROM deployer_docker_compose_files WHERE docker_compose_id = ?1 ORDER BY id ASC",
    )
    .bind(input.docker_compose_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Error al cargar archivos sincronizados: {}", e))?;

    let files = rows
        .iter()
        .map(|row| DockerComposeFile {
            id: row.get("id"),
            docker_compose_id: row.get("docker_compose_id"),
            file_path: row.get("file_path"),
            content: row.get("content"),
            is_binary: row.get("is_binary"),
            metadata: row.get("metadata"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
        .collect::<Vec<_>>();

    Ok(CommandResponse::ok(
        files,
        "tauri.docker_composes.files.sync.success",
    ))
}