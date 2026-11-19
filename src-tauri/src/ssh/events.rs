use tauri::ipc::Channel;
use tokio::time::Instant;

use crate::response::CommandResponse;
use crate::ssh::cancel::CANCELLED_MSG;
use crate::ssh::error::{err_response, SshError};
use crate::ssh::types::{RemoteConsoleEvent, RemoteFinishStatus};

/// Emite el evento `started` con el identificador del job.
pub fn emit_started(channel: &Channel<RemoteConsoleEvent>, job_id: u64) {
    let _ = channel.send(RemoteConsoleEvent::Started { job_id });
}

/// Emite un fragmento de output tal cual.
pub fn emit_output_chunk(channel: &Channel<RemoteConsoleEvent>, chunk: &str) {
    let _ = channel.send(RemoteConsoleEvent::OutputChunk {
        chunk: chunk.to_string(),
    });
}

/// Emite el evento `error` (compatibilidad; el estado terminal canónico va en
/// `finished`).
pub fn emit_error(channel: &Channel<RemoteConsoleEvent>, message: &str) {
    let _ = channel.send(RemoteConsoleEvent::Error {
        message: message.to_string(),
    });
}

/// Emite el evento `finished` con el estado terminal completo.
pub fn emit_finished(
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

/// Emite el cierre terminal de un fallo/cancelación de transferencia: evento
/// `error` por compatibilidad + `finished` con el estado real, y devuelve la
/// respuesta de error.
pub fn emit_transfer_terminal_error<T>(
    channel: &Channel<RemoteConsoleEvent>,
    start: Instant,
    error: SshError,
) -> Result<CommandResponse<T>, String> {
    let duration_seconds = start.elapsed().as_secs() as i64;
    let message = error.display_message().to_string();
    let cancelled = message == CANCELLED_MSG;

    // Compatibilidad: la UI ya escucha `error`; se evita redundancia visible en
    // el frontend.
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
