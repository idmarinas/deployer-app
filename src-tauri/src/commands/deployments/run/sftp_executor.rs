use std::path::{Path, PathBuf};
use tauri::ipc::Channel;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::time::Instant;

use crate::commands::ssh::{open_sftp_session, SshSession};

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

/// Sube uno o varios archivos, o un directorio completo, del PC local al
/// servidor remoto. `config.paths` puede tener 1 elemento (archivo suelto o
/// directorio con recursive:true) o N elementos (varios archivos/directorios
/// en la misma task, cada uno con su propio origen/destino).
pub async fn upload_file(
    session: &mut SshSession,
    task: &ResolvedTask,
    execution_id: i64,
    config: &FileTransferConfig,
    channel: &Channel<ProgressEvent>,
) -> Result<SftpResult, String> {
    session.ensure_connected().await?;

    let start = Instant::now();
    let mut output_lines: Vec<String> = Vec::new();
    let mut bytes_transferred: u64 = 0;
    let mut files_transferred: u32 = 0;

    let sftp = open_sftp_session(session).await?;

    for mapping in &config.paths {
        let src_path = resolve_local_path(&mapping.src, task.local_working_dir.as_deref());
        let dest_path = resolve_remote_path(&mapping.dest, task.remote_working_dir.as_deref());

        if mapping.recursive && src_path.is_dir() {
            upload_recursive(
                &sftp,
                &src_path,
                &dest_path,
                execution_id,
                channel,
                config.overwrite,
                mapping.exclude.as_deref(),
                mapping.chmod.as_deref(),
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
                config.overwrite,
                mapping.chmod.as_deref(),
                &mut bytes_transferred,
                &mut files_transferred,
                &mut output_lines,
            )
            .await?;
        }
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

/// Descarga uno o varios archivos, o un directorio completo, del servidor
/// remoto al PC local. Ver `upload_file` para la semántica de `config.paths`.
pub async fn download_file(
    session: &mut SshSession,
    task: &ResolvedTask,
    execution_id: i64,
    config: &FileTransferConfig,
    channel: &Channel<ProgressEvent>,
) -> Result<SftpResult, String> {
    session.ensure_connected().await?;

    let start = Instant::now();
    let mut output_lines: Vec<String> = Vec::new();
    let mut bytes_transferred: u64 = 0;
    let mut files_transferred: u32 = 0;

    let sftp = open_sftp_session(session).await?;

    for mapping in &config.paths {
        let src_path = resolve_remote_path(&mapping.src, task.remote_working_dir.as_deref());
        let dest_path = resolve_local_path(&mapping.dest, task.local_working_dir.as_deref());

        if mapping.recursive {
            download_recursive(
                &sftp,
                &src_path,
                &dest_path,
                execution_id,
                channel,
                config.overwrite,
                mapping.exclude.as_deref(),
                &mut bytes_transferred,
                &mut files_transferred,
                &mut output_lines,
            )
            .await?;
        } else {
            download_single_file(
                &sftp,
                src_path.to_str().unwrap_or(""),
                &dest_path,
                execution_id,
                channel,
                config.overwrite,
                &mut bytes_transferred,
                &mut files_transferred,
                &mut output_lines,
            )
            .await?;
        }
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

// ── Helpers internos ──────────────────────────────────────────────────────────

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

/// Aplica `chmod` (permisos octales, ej. "755") al archivo remoto recién
/// subido. No es fatal si falla (el servidor puede no soportarlo, o el
/// usuario SSH no tener permisos): se registra como aviso en el output y se
/// continúa con la transferencia.
async fn apply_chmod(
    sftp: &russh_sftp::client::SftpSession,
    remote_path: &str,
    chmod: &str,
    output_lines: &mut Vec<String>,
) {
    let mode = match u32::from_str_radix(chmod, 8) {
        Ok(m) => m,
        Err(_) => {
            output_lines.push(format!(
                "⚠ chmod '{}' inválido para '{}' (se esperaba octal, ej. 755)",
                chmod, remote_path
            ));
            return;
        }
    };

    let attrs = russh_sftp::protocol::FileAttributes {
        permissions: Some(mode),
        ..Default::default()
    };

    if let Err(e) = sftp.set_metadata(remote_path, attrs).await {
        output_lines.push(format!(
            "⚠ No se pudo aplicar chmod {} a '{}': {}",
            chmod, remote_path, e
        ));
    }
}

#[allow(clippy::too_many_arguments)]
async fn upload_single_file(
    sftp: &russh_sftp::client::SftpSession,
    src: &Path,
    dest: &PathBuf,
    execution_id: i64,
    channel: &Channel<ProgressEvent>,
    overwrite: bool,
    chmod: Option<&str>,
    bytes_transferred: &mut u64,
    files_transferred: &mut u32,
    output_lines: &mut Vec<String>,
) -> Result<(), String> {
    let src_str = src.to_string_lossy();
    let dest_str = dest.to_string_lossy();

    if !overwrite && sftp.metadata(dest_str.as_ref()).await.is_ok() {
        let msg = format!("↷ Omitido (ya existe, overwrite=false): {}", dest_str);
        output_lines.push(msg.clone());
        let _ = channel.send(ProgressEvent::OutputChunk {
            execution_id,
            chunk: format!("{}\n", msg),
        });
        return Ok(());
    }

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

    if let Some(mode) = chmod {
        apply_chmod(sftp, dest_str.as_ref(), mode, output_lines).await;
    }

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

#[allow(clippy::too_many_arguments)]
async fn upload_recursive(
    sftp: &russh_sftp::client::SftpSession,
    src_dir: &Path,
    dest_dir: &PathBuf,
    execution_id: i64,
    channel: &Channel<ProgressEvent>,
    overwrite: bool,
    exclude: Option<&[String]>,
    chmod: Option<&str>,
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
        let file_name_str = file_name.to_string_lossy();

        if let Some(patterns) = exclude {
            if super::glob::matches_any(patterns, &file_name_str) {
                continue;
            }
        }

        let dest_entry = dest_dir.join(&file_name);

        if entry_path.is_dir() {
            let _ = sftp.create_dir(dest_entry.to_str().unwrap_or("")).await;

            Box::pin(upload_recursive(
                sftp,
                &entry_path,
                &dest_entry,
                execution_id,
                channel,
                overwrite,
                exclude,
                chmod,
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
                overwrite,
                chmod,
                bytes_transferred,
                files_transferred,
                output_lines,
            )
            .await?;
        }
    }

    Ok(())
}

#[allow(clippy::too_many_arguments)]
async fn download_single_file(
    sftp: &russh_sftp::client::SftpSession,
    src: &str,
    dest: &PathBuf,
    execution_id: i64,
    channel: &Channel<ProgressEvent>,
    overwrite: bool,
    bytes_transferred: &mut u64,
    files_transferred: &mut u32,
    output_lines: &mut Vec<String>,
) -> Result<(), String> {
    let dest_str = dest.to_string_lossy();

    if !overwrite && dest.exists() {
        let msg = format!("↷ Omitido (ya existe, overwrite=false): {}", dest_str);
        output_lines.push(msg.clone());
        let _ = channel.send(ProgressEvent::OutputChunk {
            execution_id,
            chunk: format!("{}\n", msg),
        });
        return Ok(());
    }

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

#[allow(clippy::too_many_arguments)]
async fn download_recursive(
    sftp: &russh_sftp::client::SftpSession,
    src_dir: &Path,
    dest_dir: &PathBuf,
    execution_id: i64,
    channel: &Channel<ProgressEvent>,
    overwrite: bool,
    exclude: Option<&[String]>,
    bytes_transferred: &mut u64,
    files_transferred: &mut u32,
    output_lines: &mut Vec<String>,
) -> Result<(), String> {
    let src_str = src_dir.to_string_lossy().to_string();

    let entries = sftp
        .read_dir(&src_str)
        .await
        .map_err(|e| format!("Error al leer directorio remoto '{}': {}", src_str, e))?;

    tokio::fs::create_dir_all(dest_dir)
        .await
        .map_err(|e| format!("Error al crear directorio local '{}': {}", dest_dir.display(), e))?;

    for entry in entries {
        let file_name = entry.file_name();

        if let Some(patterns) = exclude {
            if super::glob::matches_any(patterns, &file_name) {
                continue;
            }
        }

        let entry_src = src_dir.join(&file_name);
        let entry_dest = dest_dir.join(&file_name);
        let is_dir = entry.file_type().is_dir();

        if is_dir {
            Box::pin(download_recursive(
                sftp,
                &entry_src,
                &entry_dest,
                execution_id,
                channel,
                overwrite,
                exclude,
                bytes_transferred,
                files_transferred,
                output_lines,
            ))
            .await?;
        } else {
            download_single_file(
                sftp,
                entry_src.to_str().unwrap_or(""),
                &entry_dest,
                execution_id,
                channel,
                overwrite,
                bytes_transferred,
                files_transferred,
                output_lines,
            )
            .await?;
        }
    }

    Ok(())
}
