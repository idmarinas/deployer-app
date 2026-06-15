use std::path::{Path, PathBuf};
use tauri::ipc::Channel;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::time::Instant;

use super::session::SshSession;
use super::types::{ProgressEvent, ResolvedTask};
use crate::commands::projects::tasks::types::FileTransferConfig;

/// Tamaño del buffer de lectura/escritura SFTP (256 KB).
const SFTP_BUFFER_SIZE: usize = 256 * 1024;

/// Resultado de una transferencia SFTP.
#[allow(dead_code)]
pub struct SftpResult {
    pub bytes_transferred: u64,
    pub files_transferred: u32,
    pub duration_seconds: i64,
    pub output_db: String,
}

/// Sube un archivo o directorio del PC local al servidor remoto.
///
/// Patrón correcto russh-sftp 2.x:
///   1. `channel_open_session()` sobre el Handle
///   2. `channel.request_subsystem(true, "sftp")` sobre el Channel
///   3. `SftpSession::new(channel.into_stream())`
pub async fn upload_file(
    session: &mut SshSession,
    task: &ResolvedTask,
    execution_id: i64,
    config: &FileTransferConfig,
    channel: &Channel<ProgressEvent>,
) -> Result<SftpResult, String> {
    session.ensure_connected().await?;

    let src_path = resolve_local_path(&config.src, task.local_working_dir.as_deref());
    let dest_path = resolve_remote_path(&config.dest, task.remote_working_dir.as_deref());

    let start = Instant::now();
    let mut output_lines: Vec<String> = Vec::new();
    let mut bytes_transferred: u64 = 0;
    let mut files_transferred: u32 = 0;

    let sftp = open_sftp_session(session).await?;

    if config.recursive && src_path.is_dir() {
        upload_recursive(
            &sftp,
            &src_path,
            &dest_path,
            execution_id,
            channel,
            &mut bytes_transferred,
            &mut files_transferred,
            &mut output_lines,
        )
        .await?;
    } else {
        upload_single_file(
            &sftp,
            &src_path,
            &dest_path,
            execution_id,
            channel,
            &mut bytes_transferred,
            &mut files_transferred,
            &mut output_lines,
        )
        .await?;
    }

    let duration_seconds = start.elapsed().as_secs() as i64;
    let output_db = output_lines.join("\n");

    Ok(SftpResult {
        bytes_transferred,
        files_transferred,
        duration_seconds,
        output_db,
    })
}

/// Descarga un archivo del servidor remoto al PC local.
pub async fn download_file(
    session: &mut SshSession,
    task: &ResolvedTask,
    execution_id: i64,
    config: &FileTransferConfig,
    channel: &Channel<ProgressEvent>,
) -> Result<SftpResult, String> {
    session.ensure_connected().await?;

    let src_path = resolve_remote_path(&config.src, task.remote_working_dir.as_deref());
    let dest_path = resolve_local_path(&config.dest, task.local_working_dir.as_deref());

    let start = Instant::now();
    let mut output_lines: Vec<String> = Vec::new();
    let mut bytes_transferred: u64 = 0;
    let mut files_transferred: u32 = 0;

    let sftp = open_sftp_session(session).await?;

    download_single_file(
        &sftp,
        src_path.to_str().unwrap_or(""),
        &dest_path,
        execution_id,
        channel,
        &mut bytes_transferred,
        &mut files_transferred,
        &mut output_lines,
    )
    .await?;

    let duration_seconds = start.elapsed().as_secs() as i64;
    let output_db = output_lines.join("\n");

    Ok(SftpResult {
        bytes_transferred,
        files_transferred,
        duration_seconds,
        output_db,
    })
}

// ── Helpers internos ──────────────────────────────────────────────────────────

/// Abre una sesión SFTP usando el patrón correcto de russh-sftp 2.x:
///   channel_open_session → request_subsystem("sftp") → SftpSession::new(channel.into_stream())
async fn open_sftp_session(
    session: &mut SshSession,
) -> Result<russh_sftp::client::SftpSession, String> {
    let channel = session
        .handle
        .channel_open_session()
        .await
        .map_err(|e| format!("Error al abrir canal SSH para SFTP: {}", e))?;

    channel
        .request_subsystem(true, "sftp")
        .await
        .map_err(|e| format!("Error al solicitar subsistema SFTP: {}", e))?;

    russh_sftp::client::SftpSession::new(channel.into_stream())
        .await
        .map_err(|e| format!("Error al iniciar sesión SFTP: {}", e))
}

fn resolve_local_path(path: &str, working_dir: Option<&str>) -> PathBuf {
    let p = Path::new(path);
    if p.is_absolute() {
        p.to_path_buf()
    } else if let Some(wd) = working_dir {
        Path::new(wd).join(p)
    } else {
        p.to_path_buf()
    }
}

fn resolve_remote_path(path: &str, working_dir: Option<&str>) -> PathBuf {
    let p = Path::new(path);
    if p.is_absolute() {
        p.to_path_buf()
    } else if let Some(wd) = working_dir {
        Path::new(wd).join(p)
    } else {
        p.to_path_buf()
    }
}

async fn upload_single_file(
    sftp: &russh_sftp::client::SftpSession,
    src: &Path,
    dest: &PathBuf,
    execution_id: i64,
    channel: &Channel<ProgressEvent>,
    bytes_transferred: &mut u64,
    files_transferred: &mut u32,
    output_lines: &mut Vec<String>,
) -> Result<(), String> {
    let src_str = src.to_string_lossy();
    let dest_str = dest.to_string_lossy();

    let msg = format!("Subiendo: {} → {}", src_str, dest_str);
    output_lines.push(msg.clone());
    let _ = channel.send(ProgressEvent::OutputChunk {
        execution_id,
        chunk: format!("{}\n", msg),
    });

    let mut local_file = tokio::fs::File::open(src)
        .await
        .map_err(|e| format!("No se pudo abrir '{}': {}", src_str, e))?;

    let file_size = local_file.metadata().await.map(|m| m.len()).unwrap_or(0);

    let mut buf = Vec::with_capacity(SFTP_BUFFER_SIZE);
    local_file
        .read_to_end(&mut buf)
        .await
        .map_err(|e| format!("Error al leer '{}': {}", src_str, e))?;

    let mut remote_file = sftp
        .create(dest_str.as_ref())
        .await
        .map_err(|e| format!("Error al crear '{}' en servidor: {}", dest_str, e))?;

    remote_file
        .write_all(&buf)
        .await
        .map_err(|e| format!("Error al escribir en servidor: {}", e))?;

    remote_file
        .flush()
        .await
        .map_err(|e| format!("Error al hacer flush SFTP: {}", e))?;

    *bytes_transferred += file_size;
    *files_transferred += 1;

    let done_msg = format!("✓ {} ({} bytes)", src_str, file_size);
    output_lines.push(done_msg.clone());
    let _ = channel.send(ProgressEvent::OutputChunk {
        execution_id,
        chunk: format!("{}\n", done_msg),
    });

    Ok(())
}

async fn upload_recursive(
    sftp: &russh_sftp::client::SftpSession,
    src_dir: &Path,
    dest_dir: &PathBuf,
    execution_id: i64,
    channel: &Channel<ProgressEvent>,
    bytes_transferred: &mut u64,
    files_transferred: &mut u32,
    output_lines: &mut Vec<String>,
) -> Result<(), String> {
    let mut entries = tokio::fs::read_dir(src_dir)
        .await
        .map_err(|e| format!("Error al leer directorio '{}': {}", src_dir.display(), e))?;

    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("Error leyendo entrada de directorio: {}", e))?
    {
        let entry_path = entry.path();
        let file_name = entry.file_name();
        let dest_entry = dest_dir.join(&file_name);

        if entry_path.is_dir() {
            let _ = sftp.create_dir(dest_entry.to_str().unwrap_or("")).await;

            Box::pin(upload_recursive(
                sftp,
                &entry_path,
                &dest_entry,
                execution_id,
                channel,
                bytes_transferred,
                files_transferred,
                output_lines,
            ))
            .await?;
        } else {
            upload_single_file(
                sftp,
                &entry_path,
                &dest_entry,
                execution_id,
                channel,
                bytes_transferred,
                files_transferred,
                output_lines,
            )
            .await?;
        }
    }

    Ok(())
}

async fn download_single_file(
    sftp: &russh_sftp::client::SftpSession,
    src: &str,
    dest: &PathBuf,
    execution_id: i64,
    channel: &Channel<ProgressEvent>,
    bytes_transferred: &mut u64,
    files_transferred: &mut u32,
    output_lines: &mut Vec<String>,
) -> Result<(), String> {
    let dest_str = dest.to_string_lossy();

    let msg = format!("Descargando: {} → {}", src, dest_str);
    output_lines.push(msg.clone());
    let _ = channel.send(ProgressEvent::OutputChunk {
        execution_id,
        chunk: format!("{}\n", msg),
    });

    let mut remote_file = sftp
        .open(src)
        .await
        .map_err(|e| format!("No se pudo abrir '{}' en servidor: {}", src, e))?;

    let mut buf = Vec::new();
    remote_file
        .read_to_end(&mut buf)
        .await
        .map_err(|e| format!("Error al leer '{}' del servidor: {}", src, e))?;

    let file_size = buf.len() as u64;

    if let Some(parent) = dest.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Error al crear directorios locales: {}", e))?;
    }

    let mut local_file = tokio::fs::File::create(dest)
        .await
        .map_err(|e| format!("No se pudo crear '{}': {}", dest_str, e))?;

    local_file
        .write_all(&buf)
        .await
        .map_err(|e| format!("Error al escribir '{}': {}", dest_str, e))?;

    *bytes_transferred += file_size;
    *files_transferred += 1;

    let done_msg = format!("✓ {} ({} bytes)", dest_str, file_size);
    output_lines.push(done_msg.clone());
    let _ = channel.send(ProgressEvent::OutputChunk {
        execution_id,
        chunk: format!("{}\n", done_msg),
    });

    Ok(())
}
