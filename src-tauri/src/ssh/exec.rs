use std::time::Duration;
use tauri::ipc::Channel;
use tauri::AppHandle;
use tauri::State;
use tokio::time::Instant;
use tokio_util::sync::CancellationToken;

use crate::response::CommandResponse;
use crate::ssh::error::err_response;
use crate::ssh::events;
use crate::ssh::keys;
use crate::ssh::{connect_to_host_by_id, open_command_channel, shell_escape, SshError, SshSession};

use crate::ssh::cancel::{RemoteJobCancel, RemoteJobGuard};
use crate::ssh::types::{RemoteCommandInput, RemoteCommandResult, RemoteConsoleEvent, RemoteFinishStatus};

/// Timeout por defecto para la ejecuciÃ³n remota (segundos).
const DEFAULT_TIMEOUT_SECS: u64 = 300;

/// Intervalo de acumulaciÃ³n de chunks de output antes de emitir al canal (ms).
const OUTPUT_CHUNK_INTERVAL_MS: u64 = 100;

/// Ejecuta un comando remoto vÃ­a SSH.
///
/// Devuelve `success: true` siempre que la ejecuciÃ³n haya llegado a tÃ©rmino
/// (incluso si el comando remoto terminÃ³ con `exit_code != 0`): los errores de
/// comando remoto se reflejan en `data.exit_code`, no en `success`. Solo se
/// devuelve `success: false` para errores de transporte (conexiÃ³n, timeout...).
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

    let (job_id, token) = state.register();
    let _job_guard = RemoteJobGuard::new(state.inner(), job_id);
    events::emit_started(&channel, job_id);

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
            events::emit_error(&channel, e.display_message());
            return err_response(e);
        }
    };

    let full_command = {
        // Normalizar fin de lÃ­nea: los scripts almacenados pueden contener CR (CRLF)
        // y bash los interpreta como parte del token (p.ej. `sleep 1\r`). El SSH exec
        // envÃ­a el string tal cual, asÃ­ que limpiar aquÃ­ garantiza LF en el servidor.
        let command = input.command.replace("\r\n", "\n").replace('\r', "\n");

        if let Some(wd) = input.working_dir.as_deref() {
            format!("cd {} && {}", shell_escape(wd), command)
        } else {
            command
        }
    };

    let run =
        run_command_streaming(&mut session, &full_command, timeout_secs, &channel, &token).await;

    let _ = session.disconnect().await;

    let (output, exit_code, duration_seconds) = match run {
        Ok(v) => v,
        Err(e) => {
            events::emit_error(&channel, e.display_message());
            return err_response(e);
        }
    };

    events::emit_finished(
        &channel,
        RemoteFinishStatus::Success,
        exit_code,
        duration_seconds,
        None,
    );

    Ok(CommandResponse::ok(
        RemoteCommandResult {
            exit_code,
            output: output.clone(),
            duration_seconds,
        },
        if exit_code == 0 {
            keys::EXEC_OK
        } else {
            keys::EXEC_COMPLETED_WITH_ERRORS
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
) -> Result<(String, i64, i64), SshError> {
    session.ensure_connected().await?;

    let mut ssh_channel = open_command_channel(session, full_command)
        .await
        .map_err(SshError::execution_failed)?;

    let start = Instant::now();
    let mut output = String::new();
    let mut chunk_buffer = String::new();
    let mut last_emit = Instant::now();
    let mut exit_code: i64 = -1;

    // Un Ãºnico plazo para toda la ejecuciÃ³n: el output ya no reinicia el reloj.
    let collect = async {
        loop {
            use russh::ChannelMsg;

            tokio::select! {
                _ = token.cancelled() => {
                    return Err(SshError::cancelled());
                }
                msg = ssh_channel.wait() => {
                    match msg {
                        Some(ChannelMsg::Data { ref data })
                        | Some(ChannelMsg::ExtendedData { ref data, ext: 1 }) => {
                            // stdout + stderr, en orden de llegada
                            let text = String::from_utf8_lossy(data).to_string();
                            output.push_str(&text);
                            chunk_buffer.push_str(&text);

                            if last_emit.elapsed() >= Duration::from_millis(OUTPUT_CHUNK_INTERVAL_MS) {
                                if !chunk_buffer.is_empty() {
                                    events::emit_output_chunk(channel, &chunk_buffer);
                                    chunk_buffer.clear();
                                    last_emit = Instant::now();
                                }
                            }
                        }
                        Some(ChannelMsg::ExitStatus { exit_status }) => {
                            exit_code = exit_status as i64;
                        }
                        // EOF llega antes que ExitStatus en OpenSSH; NO cortar aquÃ­:
                        // esperar al cierre del canal para capturar el exit code real.
                        Some(ChannelMsg::Eof) => {}
                        Some(ChannelMsg::Close) | None => break,
                        _ => {}
                    }
                }
            }
        }

        Ok::<(), SshError>(())
    };

    tokio::time::timeout(Duration::from_secs(timeout_secs), collect)
        .await
        .map_err(|_| {
            SshError::execution_failed(format!(
                "Timeout de {} segundos alcanzado",
                timeout_secs
            ))
        })??;

    if !chunk_buffer.is_empty() {
        events::emit_output_chunk(channel, &chunk_buffer);
    }

    let duration_seconds = start.elapsed().as_secs() as i64;

    Ok((output, exit_code, duration_seconds))
}


