use std::path::Path;
use tauri::AppHandle;
use tokio::io::AsyncWriteExt;

use crate::commands::docker_composes::types::{
    DockerCompose, DockerComposeOperationInput, DockerComposeService,
};
use crate::commands::helpers::open_crypto_context;
use crate::commands::ssh::{
    connect_to_host_by_id, open_sftp_session, run_ssh_command, shell_escape, SshSession,
};
use crate::commands::CommandResponse;
use crate::params;

// ============================================================================
// Helpers
// ============================================================================

/// Carga un DockerCompose por ID desde la BD.
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
        compose_content: row.get("compose_content"),
        host_id: row.get("host_id"),
        remote_path: row.get("remote_path"),
        enabled: row.get("enabled"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

/// Sube contenido de texto como archivo en el servidor remoto via SFTP.
/// Crea los directorios padre si no existen.
async fn upload_content_to_file(
    session: &mut SshSession,
    content: &[u8],
    remote_path: &str,
) -> Result<(), String> {
    session.ensure_connected().await?;

    let sftp = open_sftp_session(session).await?;

    if let Some(parent) = Path::new(remote_path).parent() {
        if let Some(parent_str) = parent.to_str() {
            let _ = sftp.create_dir(parent_str).await;
        }
    }

    let mut remote_file = sftp
        .create(remote_path)
        .await
        .map_err(|e| format!("Error al crear '{}' en servidor: {}", remote_path, e))?;

    remote_file
        .write_all(content)
        .await
        .map_err(|e| format!("Error al escribir en servidor: {}", e))?;

    remote_file
        .flush()
        .await
        .map_err(|e| format!("Error al hacer flush SFTP: {}", e))?;

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

/// Extrae el directorio padre de una ruta.
fn parent_dir(path: &str) -> &str {
    Path::new(path)
        .parent()
        .and_then(|p| p.to_str())
        .unwrap_or("/")
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

/// Helper para cargar compose + conectar al host.
async fn load_compose_and_connect(
    app: &AppHandle,
    docker_compose_id: i64,
) -> Result<(sqlx::SqlitePool, DockerCompose, SshSession), String> {
    let (pool, _key) = open_crypto_context(app).await?;
    let compose = load_docker_compose(&pool, docker_compose_id).await?;
    let host_id = compose
        .host_id
        .ok_or("Este compose no tiene un servidor asignado")?;
    let (session, _host) = connect_to_host_by_id(app, host_id, 3, true).await?;
    Ok((pool, compose, session))
}

// ============================================================================
// Comandos Tauri
// ============================================================================

/// docker compose up -d: sube el compose via SFTP y ejecuta docker compose up -d.
#[tauri::command]
pub async fn docker_compose_up(
    app: AppHandle,
    input: DockerComposeOperationInput,
) -> Result<CommandResponse<String>, String> {
    let (_pool, compose, mut session) =
        load_compose_and_connect(&app, input.docker_compose_id).await?;

    // Subir compose file via SFTP
    if let Err(e) = upload_content_to_file(
        &mut session,
        compose.compose_content.as_bytes(),
        &compose.remote_path,
    )
    .await
    {
        let _ = session.disconnect();
        return Err(format!("Error al subir docker-compose.yml: {}", e));
    }

    let working_dir = parent_dir(&compose.remote_path);
    let result = run_in_dir(
        &mut session,
        working_dir,
        &format!("docker compose -f {} up -d", compose.remote_path),
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
            "docker_composes.operations.up.success",
        ))
    } else {
        Ok(CommandResponse::err(
            "docker_composes.operations.up.failed",
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
    let (_pool, compose, mut session) =
        load_compose_and_connect(&app, input.docker_compose_id).await?;

    let working_dir = parent_dir(&compose.remote_path);
    let (output, exit_code) = run_in_dir(
        &mut session,
        working_dir,
        &format!("docker compose -f {} down", compose.remote_path),
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
            "docker_composes.operations.down.success",
        ))
    } else {
        Ok(CommandResponse::err(
            "docker_composes.operations.down.failed",
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
    let (_pool, compose, mut session) =
        load_compose_and_connect(&app, input.docker_compose_id).await?;

    let working_dir = parent_dir(&compose.remote_path);
    let (output, exit_code) = run_in_dir(
        &mut session,
        working_dir,
        &format!("docker compose -f {} ps --format json", compose.remote_path),
    )
    .await?;

    let _ = session.disconnect().await;

    if exit_code != 0 {
        return Ok(CommandResponse::err(
            "docker_composes.operations.ps.failed",
            params!("output" => output),
        ));
    }

    let services = parse_ps_output(&output);
    Ok(CommandResponse::ok(
        services,
        "docker_composes.operations.ps.success",
    ))
}

/// docker compose logs --tail 50: devuelve los logs recientes.
#[tauri::command]
pub async fn docker_compose_logs(
    app: AppHandle,
    input: DockerComposeOperationInput,
) -> Result<CommandResponse<String>, String> {
    let (_pool, compose, mut session) =
        load_compose_and_connect(&app, input.docker_compose_id).await?;

    let working_dir = parent_dir(&compose.remote_path);
    let (output, exit_code) = run_in_dir(
        &mut session,
        working_dir,
        &format!(
            "docker compose -f {} logs --tail 50",
            compose.remote_path
        ),
    )
    .await?;

    let _ = session.disconnect().await;

    if exit_code != 0 {
        return Ok(CommandResponse::err(
            "docker_composes.operations.logs.failed",
            params!("output" => output),
        ));
    }

    Ok(CommandResponse::ok(
        output,
        "docker_composes.operations.logs.success",
    ))
}

/// docker compose restart: reinicia los contenedores.
#[tauri::command]
pub async fn docker_compose_restart(
    app: AppHandle,
    input: DockerComposeOperationInput,
) -> Result<CommandResponse<String>, String> {
    let (_pool, compose, mut session) =
        load_compose_and_connect(&app, input.docker_compose_id).await?;

    let working_dir = parent_dir(&compose.remote_path);
    let (output, exit_code) = run_in_dir(
        &mut session,
        working_dir,
        &format!("docker compose -f {} restart", compose.remote_path),
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
            "docker_composes.operations.restart.success",
        ))
    } else {
        Ok(CommandResponse::err(
            "docker_composes.operations.restart.failed",
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
    let (_pool, compose, mut session) =
        load_compose_and_connect(&app, input.docker_compose_id).await?;

    let working_dir = parent_dir(&compose.remote_path);
    let (output, exit_code) = run_in_dir(
        &mut session,
        working_dir,
        &format!("docker compose -f {} pull", compose.remote_path),
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
            "docker_composes.operations.pull.success",
        ))
    } else {
        Ok(CommandResponse::err(
            "docker_composes.operations.pull.failed",
            params!("output" => message),
        ))
    }
}
