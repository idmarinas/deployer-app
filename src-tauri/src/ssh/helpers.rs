use russh::ChannelMsg;
use std::time::Duration;
use tokio::time::timeout as tokio_timeout;

use super::session::SshSession;

/// Abre una sesión SFTP sobre una sesión SSH existente.
pub async fn open_sftp_session(
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

/// Escapa una ruta para uso en shell (comillas simples).
pub fn shell_escape(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}

/// Ejecuta un comando SSH y devuelve (output, exit_code).
pub async fn run_ssh_command(
    session: &mut SshSession,
    command: &str,
    timeout_secs: u64,
) -> Result<(String, i64), String> {
    session.ensure_connected().await?;

    let mut ssh_channel = session
        .handle
        .channel_open_session()
        .await
        .map_err(|e| format!("Error al abrir canal SSH: {}", e))?;

    ssh_channel
        .exec(true, command.as_bytes())
        .await
        .map_err(|e| format!("Error al ejecutar comando SSH: {}", e))?;

    let mut output = String::new();
    let mut exit_code: i64 = 0;

    loop {
        let msg = tokio_timeout(Duration::from_secs(timeout_secs), ssh_channel.wait())
            .await
            .map_err(|_| format!("Timeout de {} segundos alcanzado", timeout_secs))?;

        match msg {
            Some(ChannelMsg::Data { ref data }) => {
                output.push_str(&String::from_utf8_lossy(data));
            }
            Some(ChannelMsg::ExtendedData { ref data, ext: 1 }) => {
                output.push_str(&String::from_utf8_lossy(data));
            }
            Some(ChannelMsg::ExitStatus { exit_status }) => {
                exit_code = exit_status as i64;
            }
            Some(ChannelMsg::Eof) | None => break,
            _ => {}
        }
    }

    Ok((normalize_output(output), exit_code))
}

/// Normaliza el output de comandos SSH: reemplaza `\r\n` por `\n` y
/// `\r` sueltos (progreso de apt-get, etc.) por `\n`.
fn normalize_output(s: String) -> String {
    let normalized = s.replace("\r\n", "\n").replace('\r', "\n");
    let mut lines: Vec<&str> = Vec::new();
    let mut prev_empty = false;
    for line in normalized.lines() {
        let empty = line.trim().is_empty();
        if empty && prev_empty {
            continue;
        }
        lines.push(line);
        prev_empty = empty;
    }
    lines.join("\n")
}
