use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use std::path::Path;
use tauri::ipc::Channel;
use tauri::AppHandle;
use tauri::State;
use tokio::io::AsyncReadExt;
use tokio::time::Instant;

use crate::response::CommandResponse;
use crate::ssh::error::err_response;
use crate::ssh::keys;
use crate::ssh::transfer::{self as transfer_utils, SFTP_BUFFER_SIZE, TransferResult};
use crate::ssh::{connect_to_host_by_id, open_sftp_session, SshError};

use crate::ssh::cancel::{RemoteJobCancel, RemoteJobGuard, CANCELLED_MSG};
use crate::ssh::types::{
    RemoteConsoleEvent, RemoteDownloadInput, RemoteDownloadResult, RemoteFinishStatus,
    RemoteTransferResult, RemoteUploadInput,
};

/// Sube un archivo (o directorio) local al servidor remoto vía SFTP.
///
/// El contenido se lee directamente del disco local (`local_path`). Los errores
/// de transporte devuelven `success: false`; el progreso se emite por el
/// `channel` opcional.
#[tauri::command]
pub async fn ssh_upload_file(
    app: AppHandle,
    input: RemoteUploadInput,
    channel: Channel<RemoteConsoleEvent>,
    state: State<'_, RemoteJobCancel>,
) -> Result<CommandResponse<RemoteTransferResult>, String> {
    let (job_id, token) = state.register();
    let _job_guard = RemoteJobGuard::new(state.inner(), job_id);
    emit_started(&channel, job_id);

    let start = Instant::now();

    let (mut session, _host) = match connect_to_host_by_id(
        &app,
        input.host_id,
        input.ssh_reconnect_attempts.unwrap_or(3),
        true,
    )
    .await
    {
        Ok(v) => v,
        Err(e) => {
            return emit_terminal_and_err(&channel, start, e);
        }
    };

    if let Err(e) = session.ensure_connected().await {
        return emit_terminal_and_err(&channel, start, e);
    }

    let sftp = match open_sftp_session(&mut session).await {
        Ok(s) => s,
        Err(e) => {
            return emit_terminal_and_err(&channel, start, SshError::transfer_failed(&e));
        }
    };

    let overwrite = input.overwrite.unwrap_or(true);

    let src = Path::new(&input.local_path).to_path_buf();
    let dest = Path::new(&input.remote_path).to_path_buf();

    let mut emit = |line: &str| {
        let _ = channel.send(RemoteConsoleEvent::OutputChunk {
            chunk: format!("{}\n", line),
        });
    };

    // Some(true) → directorio recursivo; Some(false) → archivo simple;
    // None → auto-detecta según el tipo local.
    let result = match input.recursive {
        Some(true) => {
            transfer_utils::upload_dir(
                &sftp,
                &src,
                &dest,
                overwrite,
                input.chmod.as_deref(),
                Some(&token),
                &mut emit,
            )
            .await
        }
        Some(false) => {
            transfer_utils::upload_single_file(
                &sftp,
                &src,
                &dest,
                overwrite,
                input.chmod.as_deref(),
                Some(&token),
                &mut emit,
            )
            .await
        }
        None => {
            transfer_utils::upload(
                &sftp,
                &src,
                &dest,
                overwrite,
                input.chmod.as_deref(),
                Some(&token),
                &mut emit,
            )
            .await
        }
    };

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            let error = if token.is_cancelled() {
                SshError::cancelled()
            } else {
                SshError::transfer_failed(&e)
            };
            let _ = session.disconnect().await;
            return emit_terminal_and_err(&channel, start, error);
        }
    };

    let _ = session.disconnect().await;

    let duration_seconds = start.elapsed().as_secs() as i64;
    emit_finished(
        &channel,
        RemoteFinishStatus::Success,
        0,
        duration_seconds,
        None,
    );

    Ok(CommandResponse::ok(
        RemoteTransferResult {
            bytes_transferred: result.bytes_transferred,
            files_transferred: result.files_transferred,
            duration_seconds,
        },
        keys::UPLOAD_OK,
    ))
}

/// Descarga un archivo (o directorio) del servidor remoto vía SFTP.
///
/// Si se indica `local_path`, se guarda en disco y se devuelve `saved_to`.
/// Si no, se devuelve el contenido en base64 (`content_base64`) — solo archivos
/// simples.
#[tauri::command]
pub async fn ssh_download_file(
    app: AppHandle,
    input: RemoteDownloadInput,
    channel: Channel<RemoteConsoleEvent>,
    state: State<'_, RemoteJobCancel>,
) -> Result<CommandResponse<RemoteDownloadResult>, String> {
    let (job_id, token) = state.register();
    let _job_guard = RemoteJobGuard::new(state.inner(), job_id);
    emit_started(&channel, job_id);

    let start = Instant::now();

    let (mut session, _host) = match connect_to_host_by_id(
        &app,
        input.host_id,
        input.ssh_reconnect_attempts.unwrap_or(3),
        true,
    )
    .await
    {
        Ok(v) => v,
        Err(e) => {
            return emit_terminal_and_err(&channel, start, e);
        }
    };

    if let Err(e) = session.ensure_connected().await {
        return emit_terminal_and_err(&channel, start, e);
    }

    let sftp = match open_sftp_session(&mut session).await {
        Ok(s) => s,
        Err(e) => {
            return emit_terminal_and_err(&channel, start, SshError::transfer_failed(&e));
        }
    };

    let overwrite = input.overwrite.unwrap_or(true);

    let src = Path::new(&input.remote_path).to_path_buf();

    let mut emit = |line: &str| {
        let _ = channel.send(RemoteConsoleEvent::OutputChunk {
            chunk: format!("{}\n", line),
        });
    };

    let (content_base64, saved_to, transfer) = if let Some(local_path) = input.local_path.as_deref()
    {
        let dest = Path::new(local_path).to_path_buf();

        // Some(true) → directorio recursivo; Some(false) → archivo simple;
        // None → auto-detecta según el tipo remoto.
        let result = match input.recursive {
            Some(true) => {
                transfer_utils::download_dir(
                    &sftp,
                    &src,
                    &dest,
                    overwrite,
                    Some(&token),
                    &mut emit,
                )
                .await
            }
            Some(false) => {
                transfer_utils::download_single_file(
                    &sftp,
                    &src,
                    &dest,
                    overwrite,
                    Some(&token),
                    &mut emit,
                )
                .await
            }
            None => {
                transfer_utils::download(
                    &sftp,
                    &src,
                    &dest,
                    overwrite,
                    Some(&token),
                    &mut emit,
                )
                .await
            }
        };

        match result {
            Ok(r) => (None, Some(local_path.to_string()), r),
            Err(e) => {
                let error = if token.is_cancelled() {
                    SshError::cancelled()
                } else {
                    SshError::transfer_failed(&e)
                };
                let _ = session.disconnect().await;
                return emit_terminal_and_err(&channel, start, error);
            }
        }
    } else {
        // Sin local_path: devolver el contenido en base64 (solo archivo simple).
        let src_str = src.to_string_lossy().to_string();

        let mut remote_file = match sftp.open(src_str.as_str()).await {
            Ok(f) => f,
            Err(e) => {
                let _ = session.disconnect().await;
                return emit_terminal_and_err(&channel, start, SshError::transfer_failed(&e.to_string()));
            }
        };

        let mut buf = Vec::new();
        loop {
            if token.is_cancelled() {
                let _ = session.disconnect().await;
                return emit_terminal_and_err(&channel, start, SshError::cancelled());
            }

            let mut chunk = vec![0u8; SFTP_BUFFER_SIZE];
            let n = match remote_file.read(&mut chunk).await {
                Ok(n) => n,
                Err(e) => {
                    let _ = session.disconnect().await;
                    return emit_terminal_and_err(&channel, start, SshError::transfer_failed(&e.to_string()));
                }
            };

            if n == 0 {
                break;
            }

            buf.extend_from_slice(&chunk[..n]);
        }

        (
            Some(BASE64.encode(&buf)),
            None,
            TransferResult {
                bytes_transferred: buf.len() as u64,
                files_transferred: 1,
            },
        )
    };

    let _ = session.disconnect().await;

    let duration_seconds = start.elapsed().as_secs() as i64;
    emit_finished(
        &channel,
        RemoteFinishStatus::Success,
        0,
        duration_seconds,
        None,
    );

    Ok(CommandResponse::ok(
        RemoteDownloadResult {
            content_base64,
            saved_to,
            bytes_transferred: transfer.bytes_transferred,
            files_transferred: transfer.files_transferred,
            duration_seconds,
        },
        keys::DOWNLOAD_OK,
    ))
}

// ── Helpers de canal ─────────────────────────────────────────────────────────

fn emit_started(channel: &Channel<RemoteConsoleEvent>, job_id: u64) {
    let _ = channel.send(RemoteConsoleEvent::Started { job_id });
}

fn emit_error(channel: &Channel<RemoteConsoleEvent>, message: &str) {
    let _ = channel.send(RemoteConsoleEvent::Error {
        message: message.to_string(),
    });
}

fn emit_finished(
    channel: &Channel<RemoteConsoleEvent>,
    status: RemoteFinishStatus,
    exit_code: i64,
    duration_seconds: i64,
    message: Option<String>,
) {
    let _ = channel.send(RemoteConsoleEvent::Finished {
        status,
        exit_code,
        duration_seconds,
        message,
    });
}

/// Emite el estado terminal de un fallo/cancelación (evento `error` por
/// compatibilidad + `Finished` con el estado real) y devuelve la respuesta de
/// error correspondiente.
fn emit_terminal_and_err<T>(
    channel: &Channel<RemoteConsoleEvent>,
    start: Instant,
    error: SshError,
) -> Result<CommandResponse<T>, String> {
    let duration_seconds = start.elapsed().as_secs() as i64;
    let message = error.display_message().to_string();
    let cancelled = message == CANCELLED_MSG;

    // Compatibilidad: la UI ya escucha `error`; se evita redundancia visible en
    // el frontend (no se muestra dos veces el mismo texto).
    emit_error(channel, &message);

    emit_finished(
        channel,
        if cancelled {
            RemoteFinishStatus::Cancelled
        } else {
            RemoteFinishStatus::Error
        },
        if cancelled { 130 } else { 1 },
        duration_seconds,
        Some(message),
    );

    err_response(error)
}
