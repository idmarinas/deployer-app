use std::time::Duration;
use tauri::ipc::Channel;
use tauri::AppHandle;
use tauri::State;
use tokio::time::Instant;
use tokio_util::sync::CancellationToken;

use crate::response::CommandResponse;
use crate::ssh::{connect_to_host_by_id, shell_escape, SshSession};
use crate::params;

use super::cancel::{RemoteJobCancel, CANCELLED_MSG};
use super::types::{RemoteCommandInput, RemoteCommandResult, RemoteConsoleEvent};

/// Timeout por defecto para la ejecución remota (segundos).
const DEFAULT_TIMEOUT_SECS: u64 = 300;

/// Intervalo de acumulación de chunks de output antes de emitir al canal (ms).
const OUTPUT_CHUNK_INTERVAL_MS: u64 = 100;

/// Ejecuta un comando remoto vía SSH.
///
/// Devuelve `success: true` siempre que la ejecución haya llegado a término
/// (incluso si el comando remoto terminó con `exit_code != 0`): los errores de
/// comando remoto se reflejan en `data.exit_code`, no en `success`. Solo se
/// devuelve `success: false` para errores de transporte (conexión, timeout...).
///
/// Si se pasa un `channel`, el output se emite en streaming como
/// `RemoteConsoleEvent::OutputChunk` (cada ~100ms).
#[tauri::command]
pub async fn ssh_execute_command(
    app: AppHandle,
    input: RemoteCommandInput,
    channel: Channel<RemoteConsoleEvent>,
    state: State<'_, RemoteJobCancel>,
) -> Result<CommandResponse<RemoteCommandResult>, String> {
    let timeout_secs = input.timeout_secs.unwrap_or(DEFAULT_TIMEOUT_SECS);

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

    let full_command = if let Some(wd) = input.working_dir.as_deref() {
        format!("cd {} && {}", shell_escape(wd), input.command)
    } else {
        input.command.clone()
    };

    let run = run_command_streaming(&mut session, &full_command, timeout_secs, &channel, &token)
        .await;

    let _ = session.disconnect().await;

    let (output, exit_code, duration_seconds) = match run {
        Ok(v) => v,
        Err(e) => {
            emit_error(&channel, &e);
            let key = if token.is_cancelled() {
                "tauri.remote.errors.cancelled"
            } else {
                "tauri.remote.errors.execution_failed"
            };
            return err_response(key, &e);
        }
    };

    emit_finished(&channel, exit_code, duration_seconds);

    Ok(CommandResponse::ok(
        RemoteCommandResult {
            exit_code,
            output: output.clone(),
            duration_seconds,
        },
        if exit_code == 0 {
            "tauri.remote.success.exec"
        } else {
            "tauri.remote.exec.completed_with_errors"
        },
    ))
}

/// Ejecuta el comando en el canal SSH leyendo el output en streaming.
async fn run_command_streaming(
    session: &mut SshSession,
    full_command: &str,
    timeout_secs: u64,
    channel: &Channel<RemoteConsoleEvent>,
    token: &CancellationToken,
) -> Result<(String, i64, i64), String> {
    session.ensure_connected().await?;

    let mut ssh_channel = session
        .handle
        .channel_open_session()
        .await
        .map_err(|e| format!("Error al abrir canal SSH: {}", e))?;

    ssh_channel
        .exec(true, full_command.as_bytes())
        .await
        .map_err(|e| format!("Error al ejecutar comando SSH: {}", e))?;

    let start = Instant::now();
    let mut output = String::new();
    let mut chunk_buffer = String::new();
    let mut last_emit = Instant::now();
    let mut exit_code: i64 = -1;

    loop {
        use russh::ChannelMsg;

        tokio::select! {
            _ = token.cancelled() => {
                return Err(CANCELLED_MSG.to_string());
            }
            result = tokio::time::timeout(Duration::from_secs(timeout_secs), ssh_channel.wait()) => {
                let msg = result
                    .map_err(|_| format!("Timeout de {} segundos alcanzado", timeout_secs))?;

                match msg {
                    Some(ChannelMsg::Data { ref data })
                    | Some(ChannelMsg::ExtendedData { ref data, ext: 1 }) => {
                        // stdout + stderr, en orden de llegada
                        let text = String::from_utf8_lossy(data).to_string();
                        output.push_str(&text);
                        chunk_buffer.push_str(&text);

                        if last_emit.elapsed() >= Duration::from_millis(OUTPUT_CHUNK_INTERVAL_MS) {
                            if !chunk_buffer.is_empty() {
                                emit_chunk(channel, &chunk_buffer);
                                chunk_buffer.clear();
                                last_emit = Instant::now();
                            }
                        }
                    }
                    Some(ChannelMsg::ExitStatus { exit_status }) => {
                        exit_code = exit_status as i64;
                    }
                    None => break,
                    _ => {}
                }
            }
        }
    }

    if !chunk_buffer.is_empty() {
        emit_chunk(channel, &chunk_buffer);
    }

    let duration_seconds = start.elapsed().as_secs() as i64;

    Ok((output, exit_code, duration_seconds))
}

// ── Helpers de canal ─────────────────────────────────────────────────────────

fn emit_chunk(channel: &Channel<RemoteConsoleEvent>, chunk: &str) {
    let _ = channel.send(RemoteConsoleEvent::OutputChunk {
        chunk: chunk.to_string(),
    });
}

fn emit_error(channel: &Channel<RemoteConsoleEvent>, message: &str) {
    let _ = channel.send(RemoteConsoleEvent::Error {
        message: message.to_string(),
    });
}

fn emit_finished(
    channel: &Channel<RemoteConsoleEvent>,
    exit_code: i64,
    duration_seconds: i64,
) {
    let _ = channel.send(RemoteConsoleEvent::Finished {
        exit_code,
        duration_seconds,
    });
}

/// Construye una respuesta de error de nivel de transporte con clave i18n.
fn err_response<T>(key: &str, reason: &str) -> Result<CommandResponse<T>, String> {
    Ok(CommandResponse::err(key, params!("reason" => reason)))
}
