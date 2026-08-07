use std::path::Path;
use tauri::ipc::Channel;
use tauri::AppHandle;
use tauri::State;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use tokio::io::AsyncReadExt;
use tokio::time::Instant;
use tokio_util::sync::CancellationToken;

use crate::response::CommandResponse;
use crate::ssh::transfer::{self as transfer_utils, TransferResult};
use crate::ssh::{connect_to_host_by_id, open_sftp_session};
use crate::params;

use super::cancel::{RemoteJobCancel, CANCELLED_MSG};
use super::types::{
    RemoteConsoleEvent, RemoteDownloadInput, RemoteDownloadResult, RemoteTransferResult,
    RemoteUploadInput,
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
    let token = CancellationToken::new();
    state.register(&token);

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
            emit_error(&channel, &e);
            return err_response("tauri.remote.errors.connection_failed", &e);
        }
    };

    if let Err(e) = session.ensure_connected().await {
        emit_error(&channel, &e);
        return err_response("tauri.remote.errors.connection_failed", &e);
    }

    let sftp = match open_sftp_session(&mut session).await {
        Ok(s) => s,
        Err(e) => {
            emit_error(&channel, &e);
            return err_response("tauri.remote.errors.transfer_failed", &e);
        }
    };

    let start = Instant::now();
    let overwrite = input.overwrite.unwrap_or(true);
    let force_dir = input.recursive.unwrap_or(false);

    let src = Path::new(&input.local_path).to_path_buf();
    let dest = Path::new(&input.remote_path).to_path_buf();

    let mut emit = |line: &str| {
        let _ = channel.send(RemoteConsoleEvent::OutputChunk {
            chunk: format!("{}\n", line),
        });
    };

    let result = if force_dir {
        transfer_utils::upload_dir(
            &sftp,
            &src,
            &dest,
            overwrite,
            None,
            input.chmod.as_deref(),
            Some(&token),
            &mut emit,
        )
        .await
    } else {
        // Auto-detecta archivo o directorio según el tipo local.
        transfer_utils::upload(
            &sftp,
            &src,
            &dest,
            overwrite,
            None,
            input.chmod.as_deref(),
            Some(&token),
            &mut emit,
        )
        .await
    };

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            emit_error(&channel, &e);
            let key = if token.is_cancelled() {
                "tauri.remote.errors.cancelled"
            } else {
                "tauri.remote.errors.transfer_failed"
            };
            return err_response(key, &e);
        }
    };

    let _ = session.disconnect().await;

    let duration_seconds = start.elapsed().as_secs() as i64;
    emit_finished(&channel, duration_seconds);

    Ok(CommandResponse::ok(
        RemoteTransferResult {
            bytes_transferred: result.bytes_transferred,
            files_transferred: result.files_transferred,
            duration_seconds,
        },
        "tauri.remote.success.upload",
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
    let token = CancellationToken::new();
    state.register(&token);

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
            emit_error(&channel, &e);
            return err_response("tauri.remote.errors.connection_failed", &e);
        }
    };

    if let Err(e) = session.ensure_connected().await {
        emit_error(&channel, &e);
        return err_response("tauri.remote.errors.connection_failed", &e);
    }

    let sftp = match open_sftp_session(&mut session).await {
        Ok(s) => s,
        Err(e) => {
            emit_error(&channel, &e);
            return err_response("tauri.remote.errors.transfer_failed", &e);
        }
    };

    let start = Instant::now();
    let overwrite = input.overwrite.unwrap_or(true);

    let src = Path::new(&input.remote_path).to_path_buf();

    let mut emit = |line: &str| {
        let _ = channel.send(RemoteConsoleEvent::OutputChunk {
            chunk: format!("{}\n", line),
        });
    };

    let (content_base64, saved_to, transfer) = if let Some(local_path) = input.local_path.as_deref() {
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
                    None,
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
                transfer_utils::download(&sftp, &src, &dest, overwrite, None, Some(&token), &mut emit)
                    .await
            }
        };

        match result {
            Ok(r) => (None, Some(local_path.to_string()), r),
            Err(e) => {
                emit_error(&channel, &e);
                let key = if token.is_cancelled() {
                    "tauri.remote.errors.cancelled"
                } else {
                    "tauri.remote.errors.transfer_failed"
                };
                return err_response(key, &e);
            }
        }
    } else {
        // Sin local_path: devolver el contenido en base64 (solo archivo simple).
        let src_str = src.to_string_lossy().to_string();

        let mut remote_file = match sftp.open(src_str.as_str()).await {
            Ok(f) => f,
            Err(e) => {
                let msg = e.to_string();
                emit_error(&channel, &msg);
                return err_response("tauri.remote.errors.transfer_failed", &msg);
            }
        };

        let mut buf = Vec::new();
        loop {
            if token.is_cancelled() {
                let _ = session.disconnect().await;
                emit_error(&channel, CANCELLED_MSG);
                return err_response("tauri.remote.errors.cancelled", CANCELLED_MSG);
            }

            let mut chunk = vec![0u8; 256 * 1024];
            let n = match remote_file.read(&mut chunk).await {
                Ok(n) => n,
                Err(e) => {
                    let msg = e.to_string();
                    emit_error(&channel, &msg);
                    return err_response("tauri.remote.errors.transfer_failed", &msg);
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
    emit_finished(&channel, duration_seconds);

    Ok(CommandResponse::ok(
        RemoteDownloadResult {
            content_base64,
            saved_to,
            bytes_transferred: transfer.bytes_transferred,
            files_transferred: transfer.files_transferred,
            duration_seconds,
        },
        "tauri.remote.success.download",
    ))
}

// ── Helpers de canal ─────────────────────────────────────────────────────────

fn emit_error(channel: &Channel<RemoteConsoleEvent>, message: &str) {
    let _ = channel.send(RemoteConsoleEvent::Error {
        message: message.to_string(),
    });
}

fn emit_finished(channel: &Channel<RemoteConsoleEvent>, duration_seconds: i64) {
    let _ = channel.send(RemoteConsoleEvent::Finished {
        exit_code: 0,
        duration_seconds,
    });
}

/// Construye una respuesta de error de nivel de transporte con clave i18n.
fn err_response<T>(key: &str, reason: &str) -> Result<CommandResponse<T>, String> {
    Ok(CommandResponse::err(key, params!("reason" => reason)))
}
