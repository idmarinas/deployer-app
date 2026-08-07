use tauri::ipc::Channel;
use tokio::time::Instant;

use crate::ssh::transfer::{self, TransferResult};
use crate::ssh::{open_sftp_session, SshSession};

use super::types::{ProgressEvent, ResolvedTask};
use crate::commands::projects::tasks::types::FileTransferConfig;

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

    let sftp = open_sftp_session(session).await?;

    let mut on_output = |line: &str| {
        output_lines.push(line.to_string());
        let _ = channel.send(ProgressEvent::OutputChunk {
            execution_id,
            chunk: format!("{}\n", line),
        });
    };

    let mut result = TransferResult {
        bytes_transferred: 0,
        files_transferred: 0,
    };

    for mapping in &config.paths {
        let src_path = transfer::resolve_path(&mapping.src, task.local_working_dir.as_deref());
        let dest_path = transfer::resolve_path(&mapping.dest, task.remote_working_dir.as_deref());

        let sub = transfer::upload(
            &sftp,
            &src_path,
            &dest_path,
            config.overwrite,
            mapping.exclude.as_deref(),
            mapping.chmod.as_deref(),
            None,
            &mut on_output,
        )
        .await?;

        result.bytes_transferred += sub.bytes_transferred;
        result.files_transferred += sub.files_transferred;
    }

    let duration_seconds = start.elapsed().as_secs() as i64;
    let output_db = output_lines.join("\n");

    Ok(SftpResult {
        bytes_transferred: result.bytes_transferred,
        files_transferred: result.files_transferred,
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

    let sftp = open_sftp_session(session).await?;

    let mut on_output = |line: &str| {
        output_lines.push(line.to_string());
        let _ = channel.send(ProgressEvent::OutputChunk {
            execution_id,
            chunk: format!("{}\n", line),
        });
    };

    let mut result = TransferResult {
        bytes_transferred: 0,
        files_transferred: 0,
    };

    for mapping in &config.paths {
        let src_path = transfer::resolve_path(&mapping.src, task.remote_working_dir.as_deref());
        let dest_path = transfer::resolve_path(&mapping.dest, task.local_working_dir.as_deref());

        let sub = if mapping.recursive {
            transfer::download_dir(
                &sftp,
                &src_path,
                &dest_path,
                config.overwrite,
                mapping.exclude.as_deref(),
                None,
                &mut on_output,
            )
            .await?
        } else {
            transfer::download_single_file(
                &sftp,
                &src_path,
                &dest_path,
                config.overwrite,
                None,
                &mut on_output,
            )
            .await?
        };

        result.bytes_transferred += sub.bytes_transferred;
        result.files_transferred += sub.files_transferred;
    }

    let duration_seconds = start.elapsed().as_secs() as i64;
    let output_db = output_lines.join("\n");

    Ok(SftpResult {
        bytes_transferred: result.bytes_transferred,
        files_transferred: result.files_transferred,
        duration_seconds,
        output_db,
    })
}
