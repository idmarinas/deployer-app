use std::path::Path;
use tauri::AppHandle;
use tokio::io::AsyncWriteExt;
use sqlx::Row;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};

use crate::commands::docker::compose::files_types::DockerComposeFile;
use crate::commands::docker::compose::types::{
    DockerCompose, DockerComposeOperationInput, DockerComposeService,
};
use crate::helpers::open_crypto_context;
use crate::ssh::{
    connect_to_host_by_id, open_sftp_session, run_ssh_command, shell_escape, SshSession,
};
use crate::response::CommandResponse;
use crate::params;

// ============================================================================
// Helpers
// ============================================================================

async fn load_docker_compose(
    pool: &sqlx::SqlitePool,
    id: i64,
) -> Result<DockerCompose, String> {
    use sqlx::Row;

    let row = sqlx::query("SELECT * FROM deployer_docker_composes WHERE id = ?1")
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error al cargar docker compose: {}", e))?
        .ok_or_else(|| "Docker compose no encontrado".to_string())?;

    Ok(DockerCompose {
        id: row.get("id"),
        name: row.get("name"),
        description: row.get("description"),
        host_id: row.get("host_id"),
        remote_path: row.get("remote_path"),
        enabled: row.get("enabled"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

async fn load_compose_files(
    pool: &sqlx::SqlitePool,
    docker_compose_id: i64,
) -> Result<Vec<DockerComposeFile>, String> {
    let rows = sqlx::query("SELECT * FROM deployer_docker_compose_files WHERE docker_compose_id = ?1")
        .bind(docker_compose_id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error al cargar archivos del compose: {}", e))?;

    let mut files = Vec::new();
    for row in rows {
        files.push(DockerComposeFile {
            id: row.get("id"),
            docker_compose_id: row.get("docker_compose_id"),
            file_path: row.get("file_path"),
            content: row.get("content"),
            is_binary: row.get("is_binary"),
            metadata: row.get("metadata"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        });
    }

    Ok(files)
}

/// Sube todos los archivos de un compose al servidor remoto.
async fn upload_all_compose_files(
    session: &mut SshSession,
    remote_dir: &str,
    files: &[DockerComposeFile],
) -> Result<(), String> {
    let sftp = open_sftp_session(session).await?;

    for file in files {
        let dest_path = format!("{}/{}", remote_dir.trim_end_matches('/'), file.file_path);

        let content: Vec<u8> = match &file.content {
            Some(c) if file.is_binary => {
                // Archivos binarios: el contenido se almacena en base64.
                BASE64.decode(c).map_err(|e| {
                    format!("Error al decodificar base64 de '{}': {}", file.file_path, e)
                })?
            }
            Some(c) => c.as_bytes().to_vec(),
            // Si no hay contenido almacenado, saltamos el archivo
            None => continue,
        };

        if let Some(parent) = Path::new(&dest_path).parent() {
            if let Some(parent_str) = parent.to_str() {
                let _ = sftp.create_dir(parent_str).await;
            }
        }

        let mut remote_file = sftp
            .create(&dest_path)
            .await
            .map_err(|e| format!("Error al crear '{}' en servidor: {}", dest_path, e))?;

        remote_file
            .write_all(&content)
            .await
            .map_err(|e| format!("Error al escribir '{}' en servidor: {}", dest_path, e))?;

        remote_file
            .flush()
            .await
            .map_err(|e| format!("Error al hacer flush SFTP para '{}': {}", dest_path, e))?;
    }

    Ok(())
}

/// Ejecuta un comando SSH en un directorio remoto.
async fn run_in_dir(
    session: &mut SshSession,
    working_dir: &str,
    command: &str,
) -> Result<(String, i64), String> {
    let full_command = format!("cd {} && {}", shell_escape(working_dir), command);
    run_ssh_command(session, &full_command, 300).await
}

/// Parsea el output de `docker compose ps --format json` en una lista de servicios.
fn parse_ps_output(output: &str) -> Vec<DockerComposeService> {
    output
        .lines()
        .filter(|line| !line.is_empty())
        .filter_map(|line| serde_json::from_str(line).ok())
        .collect()
}

/// Convierte un ExitStatus de docker en un mensaje legible.
fn exit_code_message(exit_code: i64, action: &str) -> String {
    if exit_code == 0 {
        format!("{} completado correctamente.", action)
    } else {
        format!("{} falló con código de salida: {}", action, exit_code)
    }
}

/// Helper para cargar compose + conectar al host + cargar archivos.
async fn load_compose_with_files(
    app: &AppHandle,
    docker_compose_id: i64,
) -> Result<(sqlx::SqlitePool, DockerCompose, Vec<DockerComposeFile>, SshSession), String> {
    let (pool, _key) = open_crypto_context(app).await?;
    let compose = load_docker_compose(&pool, docker_compose_id).await?;
    let files = load_compose_files(&pool, docker_compose_id).await?;
    let host_id = compose
        .host_id
        .ok_or("Este compose no tiene un servidor asignado")?;
    let (session, _host) = connect_to_host_by_id(app, host_id, 3, true).await?;
    Ok((pool, compose, files, session))
}

// ============================================================================
// Comandos Tauri
// ============================================================================

/// docker compose up -d: sube todos los archivos via SFTP y ejecuta docker compose up -d.
#[tauri::command]
pub async fn docker_compose_up(
    app: AppHandle,
    input: DockerComposeOperationInput,
) -> Result<CommandResponse<String>, String> {
    let (_pool, compose, files, mut session) =
        load_compose_with_files(&app, input.docker_compose_id).await?;

    let remote_dir = compose.remote_path.trim_end_matches('/');

    // Subir todos los archivos via SFTP
    upload_all_compose_files(&mut session, remote_dir, &files).await?;

    let compose_file_name = find_compose_file_name(&files)
        .unwrap_or_else(|| "compose.yaml".to_string());

    let compose_remote_path = format!("{}/{}", remote_dir, compose_file_name);

    let result = run_in_dir(
        &mut session,
        remote_dir,
        &format!("docker compose -f {} up -d", compose_remote_path),
    )
    .await;

    let _ = session.disconnect().await;

    let (output, exit_code) = result?;

    let message = format!(
        "{}\n\n{}",
        output.trim(),
        exit_code_message(exit_code, "Docker compose up")
    );

    if exit_code == 0 {
        Ok(CommandResponse::ok(
            message,
            "tauri.docker_composes.operations.up.success",
        ))
    } else {
        Ok(CommandResponse::err(
            "tauri.docker_composes.operations.up.failed",
            params!("output" => message),
        ))
    }
}

/// docker compose down: detiene y elimina los contenedores.
#[tauri::command]
pub async fn docker_compose_down(
    app: AppHandle,
    input: DockerComposeOperationInput,
) -> Result<CommandResponse<String>, String> {
    let (_pool, compose, files, mut session) =
        load_compose_with_files(&app, input.docker_compose_id).await?;

    let remote_dir = compose.remote_path.trim_end_matches('/');

    let compose_file_name = find_compose_file_name(&files)
        .unwrap_or_else(|| "compose.yaml".to_string());

    let compose_remote_path = format!("{}/{}", remote_dir, compose_file_name);

    let (output, exit_code) = run_in_dir(
        &mut session,
        remote_dir,
        &format!("docker compose -f {} down", compose_remote_path),
    )
    .await?;

    let _ = session.disconnect().await;

    let message = format!(
        "{}\n\n{}",
        output.trim(),
        exit_code_message(exit_code, "Docker compose down")
    );

    if exit_code == 0 {
        Ok(CommandResponse::ok(
            message,
            "tauri.docker_composes.operations.down.success",
        ))
    } else {
        Ok(CommandResponse::err(
            "tauri.docker_composes.operations.down.failed",
            params!("output" => message),
        ))
    }
}

/// docker compose ps --format json: devuelve la lista de servicios.
#[tauri::command]
pub async fn docker_compose_ps(
    app: AppHandle,
    input: DockerComposeOperationInput,
) -> Result<CommandResponse<Vec<DockerComposeService>>, String> {
    let (_pool, compose, files, mut session) =
        load_compose_with_files(&app, input.docker_compose_id).await?;

    let remote_dir = compose.remote_path.trim_end_matches('/');

    let compose_file_name = find_compose_file_name(&files)
        .unwrap_or_else(|| "compose.yaml".to_string());

    let compose_remote_path = format!("{}/{}", remote_dir, compose_file_name);

    let (output, exit_code) = run_in_dir(
        &mut session,
        remote_dir,
        &format!("docker compose -f {} ps --format json", compose_remote_path),
    )
    .await?;

    let _ = session.disconnect().await;

    if exit_code != 0 {
        return Ok(CommandResponse::err(
            "tauri.docker_composes.operations.ps.failed",
            params!("output" => output),
        ));
    }

    let services = parse_ps_output(&output);
    Ok(CommandResponse::ok(
        services,
        "tauri.docker_composes.operations.ps.success",
    ))
}

/// docker compose logs --tail 50: devuelve los logs recientes.
#[tauri::command]
pub async fn docker_compose_logs(
    app: AppHandle,
    input: DockerComposeOperationInput,
) -> Result<CommandResponse<String>, String> {
    let (_pool, compose, files, mut session) =
        load_compose_with_files(&app, input.docker_compose_id).await?;

    let remote_dir = compose.remote_path.trim_end_matches('/');

    let compose_file_name = find_compose_file_name(&files)
        .unwrap_or_else(|| "compose.yaml".to_string());

    let compose_remote_path = format!("{}/{}", remote_dir, compose_file_name);

    let (output, exit_code) = run_in_dir(
        &mut session,
        remote_dir,
        &format!(
            "docker compose -f {} logs --tail 50",
            compose_remote_path
        ),
    )
    .await?;

    let _ = session.disconnect().await;

    if exit_code != 0 {
        return Ok(CommandResponse::err(
            "tauri.docker_composes.operations.logs.failed",
            params!("output" => output),
        ));
    }

    Ok(CommandResponse::ok(
        output,
        "tauri.docker_composes.operations.logs.success",
    ))
}

/// docker compose restart: reinicia los contenedores.
#[tauri::command]
pub async fn docker_compose_restart(
    app: AppHandle,
    input: DockerComposeOperationInput,
) -> Result<CommandResponse<String>, String> {
    let (_pool, compose, files, mut session) =
        load_compose_with_files(&app, input.docker_compose_id).await?;

    let remote_dir = compose.remote_path.trim_end_matches('/');

    let compose_file_name = find_compose_file_name(&files)
        .unwrap_or_else(|| "compose.yaml".to_string());

    let compose_remote_path = format!("{}/{}", remote_dir, compose_file_name);

    let (output, exit_code) = run_in_dir(
        &mut session,
        remote_dir,
        &format!("docker compose -f {} restart", compose_remote_path),
    )
    .await?;

    let _ = session.disconnect().await;

    let message = format!(
        "{}\n\n{}",
        output.trim(),
        exit_code_message(exit_code, "Docker compose restart")
    );

    if exit_code == 0 {
        Ok(CommandResponse::ok(
            message,
            "tauri.docker_composes.operations.restart.success",
        ))
    } else {
        Ok(CommandResponse::err(
            "tauri.docker_composes.operations.restart.failed",
            params!("output" => message),
        ))
    }
}

/// docker compose pull: actualiza las imágenes Docker.
#[tauri::command]
pub async fn docker_compose_pull(
    app: AppHandle,
    input: DockerComposeOperationInput,
) -> Result<CommandResponse<String>, String> {
    let (_pool, compose, files, mut session) =
        load_compose_with_files(&app, input.docker_compose_id).await?;

    let remote_dir = compose.remote_path.trim_end_matches('/');

    let compose_file_name = find_compose_file_name(&files)
        .unwrap_or_else(|| "compose.yaml".to_string());

    let compose_remote_path = format!("{}/{}", remote_dir, compose_file_name);

    let (output, exit_code) = run_in_dir(
        &mut session,
        remote_dir,
        &format!("docker compose -f {} pull", compose_remote_path),
    )
    .await?;

    let _ = session.disconnect().await;

    let message = format!(
        "{}\n\n{}",
        output.trim(),
        exit_code_message(exit_code, "Docker compose pull")
    );

    if exit_code == 0 {
        Ok(CommandResponse::ok(
            message,
            "tauri.docker_composes.operations.pull.success",
        ))
    } else {
        Ok(CommandResponse::err(
            "tauri.docker_composes.operations.pull.failed",
            params!("output" => message),
        ))
    }
}

/// Devuelve el nombre del archivo compose.yaml o docker-compose.yaml
/// dentro de la lista de archivos.
fn find_compose_file_name(files: &[DockerComposeFile]) -> Option<String> {
    files
        .iter()
        .find(|f| {
            let name = f.file_path.to_lowercase();
            name == "compose.yaml" || name == "compose.yml" || name == "docker-compose.yaml" || name == "docker-compose.yml"
        })
        .map(|f| f.file_path.clone())
}

// ============================================================================
// Helpers para resolver el nombre del archivo compose
// ============================================================================