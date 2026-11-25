//! Comando de lote del gestor de archivos remoto.
//!
//! Todas las transferencias comparten una única conexión SSH/SFTP. Como máximo
//! `max_concurrency` ítems están en curso a la vez; el resto queda `pending`
//! hasta que el semáforo libera un permiso. Los eventos se correlacionan con el
//! frontend mediante la `key` de cada ítem; el `job_id` permite cancelarlos de
//! forma selectiva, incluso antes de que empiecen.
//!
//! Antes de transferir cada ítem se emite un `FileList` recursivo con todos sus
//! archivos y tamaños. Durante la transferencia se emiten `FileStarted`,
//! `FileProgress` y `FileFinished` por archivo, con un intervalo mínimo de 100
//! ms entre progresos para no saturar el canal.

use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

use russh_sftp::client::SftpSession;
use tauri::ipc::Channel;
use tauri::{AppHandle, State};
use tokio::sync::{mpsc, Mutex, Semaphore};
use tokio::task::JoinSet;
use tokio::time::Instant;
use tokio_util::sync::CancellationToken;

use crate::response::CommandResponse;
use crate::ssh::cancel::{RemoteJobCancel, RemoteJobGuard};
use crate::ssh::error::{err_response, keys, SshError};
use crate::ssh::transfer::{
    self as transfer_utils, CANCELLED_MSG, FileTransferEvent, TransferResult,
};
use crate::ssh::types::{
    RemoteBatchResult, RemoteFileManagerEvent, RemoteFinishStatus, RemoteTransferBatchInput,
    RemoteTransferDirection, RemoteTransferItemInput, RemoteTransferItemResult,
};
use crate::ssh::{connect_to_host_by_id, open_sftp_session};

/// Intervalo mínimo entre eventos `FileProgress` del mismo archivo.
const FILE_PROGRESS_THROTTLE_MS: u128 = 100;
/// Valor acordado cuando el frontend no envía el parámetro.
const DEFAULT_MAX_CONCURRENCY: u32 = 2;
/// Mismo techo que aplica la preferencia del frontend.
const MAX_CONCURRENCY: u32 = 16;

type EventChannel = Arc<Mutex<Channel<RemoteFileManagerEvent>>>;

async fn send_event(channel: &EventChannel, event: RemoteFileManagerEvent) {
    let guard = channel.lock().await;
    let _ = guard.send(event);
}

/// Serializa todos los envíos al canal y corrige el total acumulado de
/// `Progress`, que debe crecer en orden de llegada aunque los ítems terminen
/// desordenados.
async fn forward_events(
    mut receiver: mpsc::UnboundedReceiver<RemoteFileManagerEvent>,
    channel: EventChannel,
) {
    let mut cumulative_bytes = 0u64;
    while let Some(mut event) = receiver.recv().await {
        if let RemoteFileManagerEvent::Progress { bytes, total, .. } = &mut event {
            cumulative_bytes = cumulative_bytes.saturating_add(*bytes);
            *total = cumulative_bytes;
        }
        send_event(&channel, event).await;
    }
}

/// Procesa un lote de subidas/descargas con una sola conexión SSH/SFTP.
///
/// Los tokens de cancelación se registran todos al principio y se entregan en
/// `BatchStarted.job_ids`, de modo que el frontend puede cancelar también un
/// ítem que todavía no ha empezado. `ItemStarted` se emite al obtener un
/// permiso del semáforo, por lo que puede llegar desordenado.
#[tauri::command]
pub async fn ssh_file_manager_transfer(
    app: AppHandle,
    input: RemoteTransferBatchInput,
    channel: Channel<RemoteFileManagerEvent>,
    state: State<'_, RemoteJobCancel>,
) -> Result<CommandResponse<RemoteBatchResult>, String> {
    let start = Instant::now();
    let max_concurrency = input
        .max_concurrency
        .unwrap_or(DEFAULT_MAX_CONCURRENCY)
        .clamp(1, MAX_CONCURRENCY) as usize;

    // Un token por ítem, registrado antes de abrir la conexión: así
    // `ssh_cancel_remote_job(job_id)` funciona también para ítems pendientes.
    let mut job_id_by_key = HashMap::with_capacity(input.items.len());
    let mut tokens = HashMap::with_capacity(input.items.len());
    let mut guards = Vec::with_capacity(input.items.len());
    for item in &input.items {
        let (job_id, token) = state.register();
        guards.push(RemoteJobGuard::new(state.inner(), job_id));
        job_id_by_key.insert(item.key.clone(), job_id);
        tokens.insert(item.key.clone(), token);
    }

    let channel = Arc::new(Mutex::new(channel));
    let (event_tx, event_rx) = mpsc::unbounded_channel();
    let forwarder = tokio::spawn(forward_events(event_rx, Arc::clone(&channel)));

    send_event(
        &channel,
        RemoteFileManagerEvent::BatchStarted {
            total: input.items.len() as u32,
            job_ids: job_id_by_key.clone(),
        },
    )
    .await;

    if input.items.is_empty() {
        let result = RemoteBatchResult {
            items: Vec::new(),
            bytes_transferred: 0,
            files_transferred: 0,
            duration_seconds: start.elapsed().as_secs() as i64,
        };
        drop(event_tx);
        let _ = forwarder.await;
        emit_batch_finished(&channel, &result).await;
        return Ok(CommandResponse::ok(result, keys::BATCH_OK));
    }

    let (mut session, _host) = match connect_to_host_by_id(
        &app,
        input.host_id,
        input.ssh_reconnect_attempts.unwrap_or(3),
        true,
    )
    .await
    {
        Ok(v) => v,
        Err(e) => return emit_batch_error(&channel, start, e, input.items.len()).await,
    };

    if let Err(e) = session.ensure_connected().await {
        return emit_batch_error(&channel, start, e, input.items.len()).await;
    }

    // `SftpSession` no es `Clone`, pero internamente envuelve un
    // `Arc<RawSftpSession>` y todos sus métodos toman `&self`: compartir el
    // handle evita abrir una sesión SFTP por archivo (y una conexión SSH nueva).
    let sftp = match open_sftp_session(&mut session).await {
        Ok(s) => Arc::new(s),
        Err(e) => {
            return emit_batch_error(
                &channel,
                start,
                SshError::transfer_failed(&e),
                input.items.len(),
            )
            .await
        }
    };

    let semaphore = Arc::new(Semaphore::new(max_concurrency));
    let mut tasks = JoinSet::new();

    for (index, item) in input.items.iter().cloned().enumerate() {
        let token = tokens
            .get(&item.key)
            .expect("todo ítem del lote tiene un token registrado")
            .clone();
        let job_id = *job_id_by_key
            .get(&item.key)
            .expect("todo ítem del lote tiene un job_id registrado");
        let sftp = Arc::clone(&sftp);
        let semaphore = Arc::clone(&semaphore);
        let event_tx = event_tx.clone();

        tasks.spawn(async move {
            run_item_task(index, item, sftp, token, job_id, semaphore, event_tx).await
        });
    }
    drop(event_tx);

    let mut ordered: Vec<Option<RemoteTransferItemResult>> = (0..input.items.len())
        .map(|_| None)
        .collect();
    let mut total_bytes = 0u64;
    let mut total_files = 0u32;

    while let Some(joined) = tasks.join_next().await {
        if let Ok((index, result)) = joined {
            total_bytes += result.bytes_transferred;
            total_files += result.files_transferred;
            ordered[index] = Some(result);
        }
    }

    // Una tarea en pánico no debe dejar un hueco en el resultado agregado.
    for (index, slot) in ordered.iter_mut().enumerate() {
        if slot.is_none() {
            *slot = Some(build_result(
                &input.items[index],
                RemoteFinishStatus::Error,
                Some(SshError::transfer_failed("Tarea del lote interrumpida")),
                TransferResult {
                    bytes_transferred: 0,
                    files_transferred: 0,
                },
                start,
                String::new(),
            ));
        }
    }

    let _ = session.disconnect().await;
    let _ = forwarder.await;

    let result = RemoteBatchResult {
        items: ordered.into_iter().flatten().collect(),
        bytes_transferred: total_bytes,
        files_transferred: total_files,
        duration_seconds: start.elapsed().as_secs() as i64,
    };
    emit_batch_finished(&channel, &result).await;

    Ok(CommandResponse::ok(result, keys::BATCH_OK))
}

/// Espera su turno, ejecuta un ítem y devuelve el resultado junto a su índice
/// para reconstruir el lote en el orden de entrada.
#[allow(clippy::too_many_arguments)]
async fn run_item_task(
    index: usize,
    item: RemoteTransferItemInput,
    sftp: Arc<SftpSession>,
    token: CancellationToken,
    job_id: u64,
    semaphore: Arc<Semaphore>,
    event_tx: mpsc::UnboundedSender<RemoteFileManagerEvent>,
) -> (usize, RemoteTransferItemResult) {
    // Adquirir antes de `item_started`: así nunca hay más ítems `running` que
    // el límite configurado, aunque el backend reciba todos los ítems a la vez.
    let _permit = semaphore.acquire().await.expect("semáforo del lote cerrado");
    let _ = event_tx.send(RemoteFileManagerEvent::ItemStarted {
        key: item.key.clone(),
        job_id,
    });

    let item_start = Instant::now();
    let mut output = String::new();
    let mut emit = |line: &str| {
        output.push_str(line);
        output.push('\n');
    };

    let local = Path::new(&item.local_path).to_path_buf();
    let remote = Path::new(&item.remote_path).to_path_buf();

    // Un ítem pendiente puede cancelarse antes de su turno: no se toca la sesión.
    let transfer = if token.is_cancelled() {
        Err(CANCELLED_MSG.to_string())
    } else {
        let listed = match item.direction {
            RemoteTransferDirection::Upload => transfer_utils::list_local_files(&local).await,
            RemoteTransferDirection::Download => {
                transfer_utils::list_remote_files(sftp.as_ref(), &remote, 0).await
            }
        };

        match listed {
            Ok(files) => {
                let total_bytes_listed = files.iter().map(|file| file.size).sum();
                let total_files_listed = files.len() as u32;
                let _ = event_tx.send(RemoteFileManagerEvent::FileList {
                    key: item.key.clone(),
                    files: files.clone(),
                    total_bytes: total_bytes_listed,
                    total_files: total_files_listed,
                });

                // El callback de bytes entrega la ruta completa; estos mapas
                // la traducen al `id` estable del pre-listado.
                let id_by_path: HashMap<String, String> = files
                    .iter()
                    .map(|file| (file.path.clone(), file.id.clone()))
                    .collect();
                let size_by_id: HashMap<String, u64> = files
                    .iter()
                    .map(|file| (file.id.clone(), file.size))
                    .collect();
                let mut last_emit: HashMap<String, Instant> = HashMap::new();
                let item_key = item.key.clone();
                let file_tx = event_tx.clone();

                let mut emit_file_event = |event: FileTransferEvent| match event {
                    FileTransferEvent::Started { path, size } => {
                        if let Some(id) = id_by_path.get(&path) {
                            let _ = file_tx.send(RemoteFileManagerEvent::FileStarted {
                                key: item_key.clone(),
                                file_id: id.clone(),
                                path,
                                bytes: size,
                            });
                            last_emit.insert(id.clone(), Instant::now());
                        }
                    }
                    FileTransferEvent::Bytes { path, bytes } => {
                        if let Some(id) = id_by_path.get(&path) {
                            let total = size_by_id.get(id).copied().unwrap_or(0);
                            let now = Instant::now();
                            let elapsed = last_emit
                                .get(id)
                                .map(|last| now.duration_since(*last).as_millis())
                                .unwrap_or(u128::MAX);
                            // El último evento de un archivo siempre se envía.
                            if elapsed >= FILE_PROGRESS_THROTTLE_MS || bytes >= total {
                                let _ = file_tx.send(RemoteFileManagerEvent::FileProgress {
                                    key: item_key.clone(),
                                    file_id: id.clone(),
                                    bytes,
                                    total,
                                });
                                last_emit.insert(id.clone(), now);
                            }
                        }
                    }
                    FileTransferEvent::Finished { path, bytes } => {
                        if let Some(id) = id_by_path.get(&path) {
                            let total = size_by_id.get(id).copied().unwrap_or(0);
                            let _ = file_tx.send(RemoteFileManagerEvent::FileProgress {
                                key: item_key.clone(),
                                file_id: id.clone(),
                                bytes,
                                total,
                            });
                            let _ = file_tx.send(RemoteFileManagerEvent::FileFinished {
                                key: item_key.clone(),
                                file_id: id.clone(),
                                bytes,
                                status: RemoteFinishStatus::Success,
                                message_key: None,
                            });
                        }
                    }
                    FileTransferEvent::Cancelled { path, bytes } => {
                        if let Some(id) = id_by_path.get(&path) {
                            let _ = file_tx.send(RemoteFileManagerEvent::FileFinished {
                                key: item_key.clone(),
                                file_id: id.clone(),
                                bytes,
                                status: RemoteFinishStatus::Cancelled,
                                message_key: None,
                            });
                        }
                    }
                };

                run_item(
                    sftp.as_ref(),
                    &item,
                    &token,
                    &mut emit,
                    &mut emit_file_event,
                )
                .await
            }
            // El error de enumeración se mapea más abajo como error del ítem.
            Err(reason) => Err(reason),
        }
    };

    let result = match transfer {
        Ok(transfer) => {
            let _ = event_tx.send(RemoteFileManagerEvent::Progress {
                key: item.key.clone(),
                bytes: transfer.bytes_transferred,
                // `forward_events` calcula el acumulado en orden de llegada.
                total: 0,
            });

            build_result(
                &item,
                RemoteFinishStatus::Success,
                None,
                transfer,
                item_start,
                output,
            )
        }
        Err(reason) => {
            let (status, error) = if token.is_cancelled() {
                (RemoteFinishStatus::Cancelled, SshError::cancelled())
            } else {
                (RemoteFinishStatus::Error, SshError::transfer_failed(&reason))
            };
            build_result(
                &item,
                status.clone(),
                Some(error),
                TransferResult {
                    bytes_transferred: 0,
                    files_transferred: 0,
                },
                item_start,
                output,
            )
        }
    };

    let _ = event_tx.send(RemoteFileManagerEvent::ItemFinished {
        key: item.key.clone(),
        status: result.status.clone(),
        result: result.clone(),
    });

    (index, result)
}

/// Ejecuta un ítem con las utilidades de `transfer.rs`, propagando el detalle
/// por archivo al adaptador que emite los eventos del canal.
async fn run_item<F, B>(
    sftp: &SftpSession,
    item: &RemoteTransferItemInput,
    token: &CancellationToken,
    emit: &mut F,
    on_file_event: &mut B,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
    B: FnMut(FileTransferEvent) + Send,
{
    let overwrite = item.overwrite.unwrap_or(true);
    let local = Path::new(&item.local_path).to_path_buf();
    let remote = Path::new(&item.remote_path).to_path_buf();
    let cancel = Some(token);

    match item.direction {
        RemoteTransferDirection::Upload => {
            transfer_utils::upload_with_progress(
                sftp,
                &local,
                &remote,
                overwrite,
                item.chmod.as_deref(),
                item.recursive,
                cancel,
                emit,
                on_file_event,
            )
            .await
        }
        RemoteTransferDirection::Download => {
            transfer_utils::download_with_progress(
                sftp,
                &remote,
                &local,
                overwrite,
                item.recursive,
                cancel,
                emit,
                on_file_event,
            )
            .await
        }
    }
}

fn build_result(
    item: &RemoteTransferItemInput,
    status: RemoteFinishStatus,
    error: Option<SshError>,
    transfer: TransferResult,
    item_start: Instant,
    output: String,
) -> RemoteTransferItemResult {
    let message = error.as_ref().map(|e| e.display_message().to_string());
    let message_key = error.as_ref().map(|e| e.key.to_string()).unwrap_or_default();
    let message_params = error.map(|e| e.params).unwrap_or_default();

    RemoteTransferItemResult {
        key: item.key.clone(),
        status,
        bytes_transferred: transfer.bytes_transferred,
        files_transferred: transfer.files_transferred,
        duration_seconds: item_start.elapsed().as_secs() as i64,
        message,
        message_key,
        message_params,
        output,
    }
}

async fn emit_batch_finished(channel: &EventChannel, result: &RemoteBatchResult) {
    let mut succeeded = 0u32;
    let mut failed = 0u32;
    let mut cancelled = 0u32;

    for item in &result.items {
        match &item.status {
            RemoteFinishStatus::Success => succeeded += 1,
            RemoteFinishStatus::Error => failed += 1,
            RemoteFinishStatus::Cancelled => cancelled += 1,
        }
    }

    send_event(
        channel,
        RemoteFileManagerEvent::BatchFinished {
            succeeded,
            failed,
            cancelled,
            duration_seconds: result.duration_seconds,
        },
    )
    .await;
}

/// Fallo a nivel de lote (conexión/SFTP): se cierra el lote y se devuelve la
/// respuesta de error con su clave i18n.
async fn emit_batch_error<T>(
    channel: &EventChannel,
    start: Instant,
    error: SshError,
    pending: usize,
) -> Result<CommandResponse<T>, String> {
    send_event(
        channel,
        RemoteFileManagerEvent::BatchFinished {
            succeeded: 0,
            failed: pending as u32,
            cancelled: 0,
            duration_seconds: start.elapsed().as_secs() as i64,
        },
    )
    .await;
    err_response(error)
}
