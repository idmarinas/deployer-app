use std::time::Duration;
use tauri::ipc::Channel;
use tokio::time::Instant;

use super::session::SshSession;
use super::types::{ProgressEvent, ResolvedTask};

/// Tamaño máximo del output almacenado en BD (64 KB). El excedente va al log.
const MAX_OUTPUT_DB_BYTES: usize = 64 * 1024;

/// Intervalo de acumulación de chunks de output antes de emitir al canal (ms).
const OUTPUT_CHUNK_INTERVAL_MS: u64 = 100;

/// Resultado de la ejecución de un comando SSH.
pub struct SshExecutionResult {
    pub exit_code: i64,
    /// Output truncado para almacenar en BD.
    pub output_db: String,
    /// Output completo para el archivo de log.
    pub output_full: String,
    pub duration_seconds: i64,
}

/// Ejecuta un comando remoto en el servidor SSH.
///
/// Si `working_dir` está presente, antepone `cd <working_dir> && ` al comando.
/// El output se emite en chunks al canal y se acumula en memoria para BD y log.
pub async fn execute_command(
    session: &mut SshSession,
    task: &ResolvedTask,
    execution_id: i64,
    command: &str,
    channel: &Channel<ProgressEvent>,
) -> Result<SshExecutionResult, String> {
    session.ensure_connected().await?;

    // Construir el comando final con working_dir si aplica
    let full_command = if let Some(ref wd) = task.remote_working_dir {
        format!("cd {} && {}", shell_escape(wd), command)
    } else {
        command.to_string()
    };

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
    let mut output_full = String::new();
    let mut chunk_buffer = String::new();
    let mut last_emit = Instant::now();
    let mut exit_code: i64 = -1;

    // Leer output en streaming
    loop {
        use russh::ChannelMsg;

        let msg = tokio::time::timeout(
            Duration::from_secs(task.timeout as u64),
            ssh_channel.wait(),
        )
        .await
        .map_err(|_| {
            format!(
                "Timeout de {} segundos alcanzado ejecutando la tarea '{}'",
                task.timeout, task.task_name
            )
        })?;

        match msg {
            Some(ChannelMsg::Data { ref data }) => {
                let text = String::from_utf8_lossy(data).to_string();
                output_full.push_str(&text);
                chunk_buffer.push_str(&text);

                // Emitir chunk si ha pasado el intervalo
                if last_emit.elapsed() >= Duration::from_millis(OUTPUT_CHUNK_INTERVAL_MS) {
                    if !chunk_buffer.is_empty() {
                        let _ = channel.send(ProgressEvent::OutputChunk {
                            execution_id,
                            chunk: chunk_buffer.clone(),
                        });
                        chunk_buffer.clear();
                        last_emit = Instant::now();
                    }
                }
            }
            Some(ChannelMsg::ExtendedData { ref data, ext: 1 }) => {
                // stderr
                let text = String::from_utf8_lossy(data).to_string();
                output_full.push_str(&text);
                chunk_buffer.push_str(&text);
            }
            Some(ChannelMsg::ExitStatus { exit_status }) => {
                exit_code = exit_status as i64;
            }
            Some(ChannelMsg::Eof) | None => break,
            _ => {}
        }
    }

    // Emitir el chunk restante
    if !chunk_buffer.is_empty() {
        let _ = channel.send(ProgressEvent::OutputChunk {
            execution_id,
            chunk: chunk_buffer,
        });
    }

    let duration_seconds = start.elapsed().as_secs() as i64;

    // Truncar output para BD si supera el límite
    let output_db = if output_full.len() > MAX_OUTPUT_DB_BYTES {
        let truncated = &output_full[..MAX_OUTPUT_DB_BYTES];
        format!(
            "{}\n... [output truncado, ver log completo]",
            truncated
        )
    } else {
        output_full.clone()
    };

    Ok(SshExecutionResult {
        exit_code,
        output_db,
        output_full,
        duration_seconds,
    })
}

/// Ejecuta un script en el servidor: sube el contenido a un archivo temporal,
/// lo ejecuta y elimina el temporal al finalizar.
pub async fn execute_script(
    session: &mut SshSession,
    task: &ResolvedTask,
    execution_id: i64,
    script_content: &str,
    channel: &Channel<ProgressEvent>,
) -> Result<SshExecutionResult, String> {
    session.ensure_connected().await?;

    // Ruta del script temporal en el servidor
    let remote_tmp = format!("/tmp/.deployer_script_{}.sh", execution_id);

    // Crear el script usando heredoc para evitar problemas de escaping
    let create_cmd = format!(
        "cat > {} << 'DEPLOYER_EOF'\n{}\nDEPLOYER_EOF\nchmod +x {}",
        remote_tmp, script_content, remote_tmp
    );

    // Paso 1: crear el archivo temporal
    {
        let mut ch = session
            .handle
            .channel_open_session()
            .await
            .map_err(|e| format!("Error al abrir canal SSH para subir script: {}", e))?;

        ch.exec(true, create_cmd.as_bytes())
            .await
            .map_err(|e| format!("Error al crear script temporal: {}", e))?;

        // Esperar a que termine
        loop {
            use russh::ChannelMsg;
            match ch.wait().await {
                Some(ChannelMsg::ExitStatus { .. }) | Some(ChannelMsg::Eof) | None => break,
                _ => {}
            }
        }
    }

    // Paso 2: ejecutar el script (reutilizando execute_command con la ruta del temporal)
    let result = execute_command(session, task, execution_id, &remote_tmp, channel).await;

    // Paso 3: limpiar el archivo temporal (best-effort, no falla si ya no existe)
    {
        if session.ensure_connected().await.is_ok() {
            if let Ok(mut ch) = session.handle.channel_open_session().await {
                let cleanup = format!("rm -f {}", remote_tmp);
                let _ = ch.exec(true, cleanup.as_bytes()).await;
                loop {
                    use russh::ChannelMsg;
                    match ch.wait().await {
                        Some(ChannelMsg::ExitStatus { .. }) | Some(ChannelMsg::Eof) | None => break,
                        _ => {}
                    }
                }
            }
        }
    }

    result
}

// ── Helpers internos ──────────────────────────────────────────────────────────

/// Escapa una ruta para uso seguro en shell (comillas simples).
fn shell_escape(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}
