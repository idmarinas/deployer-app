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

/// Abre un canal SSH y ejecuta `command`, dejando el canal listo para leer mensajes.
///
/// No comprueba la conexión: cada caller decide cuándo llamar a `ensure_connected`.
pub async fn open_command_channel(
    session: &mut SshSession,
    command: &str,
) -> Result<russh::Channel<russh::client::Msg>, String> {
    let channel = session
        .handle
        .channel_open_session()
        .await
        .map_err(|e| format!("Error al abrir canal SSH: {}", e))?;

    channel
        .exec(true, command.as_bytes())
        .await
        .map_err(|e| format!("Error al ejecutar comando SSH: {}", e))?;

    Ok(channel)
}
