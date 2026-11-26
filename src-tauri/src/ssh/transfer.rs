//! Utilidades SFTP genéricas, desacopladas del runner de deployments.
//!
//! Permiten subir/descargar archivos o directorios vía SFTP emitiendo
//! progreso por un callback genérico (`F: FnMut(&str)`). No dependen de
//! `ResolvedTask`, `ProgressEvent` ni `Channel`: cada caller decide cómo
//! consumir las líneas de output (acumularlas, enviarlas por un canal, etc.).
//!
//! El gestor de archivos activa además un `TransferHooks::on_file_event` que
//! informa del inicio, los bytes parciales y el fin de cada archivo. Las firmas
//! públicas históricas siguen iguales: la consola remota no ve ningún cambio.

use std::path::{Path, PathBuf};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio_util::sync::CancellationToken;

use crate::ssh::types::RemoteTransferFileInfo;

/// Tamaño del buffer de lectura/escritura SFTP (256 KB).
pub const SFTP_BUFFER_SIZE: usize = 256 * 1024;

/// Mensaje devuelto cuando el usuario cancela la transferencia.
pub const CANCELLED_MSG: &str = "Operación cancelada por el usuario";

/// Profundidad máxima al descender por enlaces simbólicos en descargas
/// recursivas. Corta bucles (p. ej. `current -> releases/…` que contiene otro
/// enlace al padre) antes de agotar la pila.
const MAX_DOWNLOAD_DEPTH: usize = 32;

/// Devuelve `true` si el token de cancelación está activo (o si no hay token,
/// nunca cancela).
fn cancelled(cancel: Option<&CancellationToken>) -> bool {
    cancel.map(|c| c.is_cancelled()).unwrap_or(false)
}

/// Une un nombre a una ruta **remota** SFTP usando siempre `/`.
///
/// `Path::join` usa el separador del SO anfitrión: en Windows produciría
/// `/var/www/site\index.html`, que no existe en un servidor Unix. Las rutas
/// locales sí siguen usando `Path::join`.
pub(crate) fn join_remote_path(base: &Path, name: &str) -> PathBuf {
    let base = base.to_string_lossy();
    PathBuf::from(format!("{}/{}", base.trim_end_matches('/'), name))
}

/// Resultado de una transferencia SFTP.
#[derive(Debug, Clone, Copy)]
pub struct TransferResult {
    pub bytes_transferred: u64,
    pub files_transferred: u32,
}

impl TransferResult {
    fn zero() -> Self {
        Self {
            bytes_transferred: 0,
            files_transferred: 0,
        }
    }

    fn add(&mut self, other: TransferResult) {
        self.bytes_transferred += other.bytes_transferred;
        self.files_transferred += other.files_transferred;
    }
}

/// Detalle de un archivo dentro de una transferencia. Lo consume el gestor de
/// archivos para correlacionar el avance con la lista previa de archivos.
#[derive(Debug, Clone)]
pub enum FileTransferEvent {
    Started { path: String, size: u64 },
    Bytes { path: String, bytes: u64 },
    Finished { path: String, bytes: u64 },
    Cancelled { path: String, bytes: u64 },
}

/// Callbacks compartidos por todas las utilidades de este módulo.
///
/// `on_file_event` es `None` en la consola remota: el coste de cada evento es
/// solo una comprobación de opción por chunk.
pub struct TransferHooks<'a, F>
where
    F: FnMut(&str),
{
    pub on_output: &'a mut F,
    // Los comandos Tauri exigen futures `Send`: el callback vive mientras se
    // hace `.await`, así que el trait object también debe ser `Send`.
    pub on_file_event: Option<&'a mut (dyn FnMut(FileTransferEvent) + Send)>,
}

impl<'a, F> TransferHooks<'a, F>
where
    F: FnMut(&str),
{
    fn new(on_output: &'a mut F) -> Self {
        Self {
            on_output,
            on_file_event: None,
        }
    }

    fn file_started(&mut self, path: &str, size: u64) {
        if let Some(cb) = &mut self.on_file_event {
            cb(FileTransferEvent::Started {
                path: path.to_string(),
                size,
            });
        }
    }

    fn file_bytes(&mut self, path: &str, bytes: u64) {
        if let Some(cb) = &mut self.on_file_event {
            cb(FileTransferEvent::Bytes {
                path: path.to_string(),
                bytes,
            });
        }
    }

    fn file_finished(&mut self, path: &str, bytes: u64) {
        if let Some(cb) = &mut self.on_file_event {
            cb(FileTransferEvent::Finished {
                path: path.to_string(),
                bytes,
            });
        }
    }

    fn file_cancelled(&mut self, path: &str, bytes: u64) {
        if let Some(cb) = &mut self.on_file_event {
            cb(FileTransferEvent::Cancelled {
                path: path.to_string(),
                bytes,
            });
        }
    }
}

// ── Subidas ──────────────────────────────────────────────────────────────────

/// Sube un archivo local a una ruta remota.
pub async fn upload_single_file<F>(
    sftp: &russh_sftp::client::SftpSession,
    src: &Path,
    dest: &Path,
    overwrite: bool,
    chmod: Option<&str>,
    cancel: Option<&CancellationToken>,
    on_output: &mut F,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
{
    upload_single_file_inner(
        sftp,
        src,
        dest,
        overwrite,
        chmod,
        cancel,
        &mut TransferHooks::new(on_output),
    )
    .await
}

async fn upload_single_file_inner<F>(
    sftp: &russh_sftp::client::SftpSession,
    src: &Path,
    dest: &Path,
    overwrite: bool,
    chmod: Option<&str>,
    cancel: Option<&CancellationToken>,
    hooks: &mut TransferHooks<'_, F>,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
{
    let src_str = src.to_string_lossy();
    let dest_str = dest.to_string_lossy();

    if !overwrite && sftp.metadata(dest_str.as_ref()).await.is_ok() {
        let msg = format!("↷ Omitido (ya existe, overwrite=false): {}", dest_str);
        (hooks.on_output)(&msg);
        hooks.file_started(&src_str, 0);
        hooks.file_finished(&src_str, 0);
        return Ok(TransferResult::zero());
    }

    let msg = format!("Subiendo: {} → {}", src_str, dest_str);
    (hooks.on_output)(&msg);

    let mut local_file = tokio::fs::File::open(src)
        .await
        .map_err(|e| format!("No se pudo abrir '{}': {}", src_str, e))?;

    let file_size = local_file.metadata().await.map(|m| m.len()).unwrap_or(0);
    hooks.file_started(&src_str, file_size);

    let mut remote_file = sftp
        .create(dest_str.as_ref())
        .await
        .map_err(|e| format!("Error al crear '{}' en servidor: {}", dest_str, e))?;

    let mut buf = vec![0u8; SFTP_BUFFER_SIZE];
    let mut transferred = 0u64;
    loop {
        if cancelled(cancel) {
            // No dejar un archivo remoto a medias tras cancelar.
            let _ = sftp.remove_file(dest_str.as_ref()).await;
            hooks.file_cancelled(&src_str, transferred);
            return Err(CANCELLED_MSG.to_string());
        }

        let read = local_file
            .read(&mut buf)
            .await
            .map_err(|e| format!("Error al leer '{}': {}", src_str, e))?;
        if read == 0 {
            break;
        }

        remote_file
            .write_all(&buf[..read])
            .await
            .map_err(|e| format!("Error al escribir en servidor: {}", e))?;

        transferred += read as u64;
        hooks.file_bytes(&src_str, transferred);
    }

    remote_file
        .flush()
        .await
        .map_err(|e| format!("Error al hacer flush SFTP: {}", e))?;

    if let Some(mode) = chmod {
        apply_chmod(sftp, dest_str.as_ref(), mode, &mut *hooks.on_output).await;
    }

    let done_msg = format!("✓ {} ({} bytes)", src_str, transferred);
    (hooks.on_output)(&done_msg);
    hooks.file_finished(&src_str, transferred);

    Ok(TransferResult {
        bytes_transferred: transferred,
        files_transferred: 1,
    })
}

/// Sube un directorio local a una ruta remota de forma recursiva.
pub async fn upload_dir<F>(
    sftp: &russh_sftp::client::SftpSession,
    src_dir: &Path,
    dest_dir: &Path,
    overwrite: bool,
    chmod: Option<&str>,
    cancel: Option<&CancellationToken>,
    on_output: &mut F,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
{
    upload_dir_inner(
        sftp,
        src_dir,
        dest_dir,
        overwrite,
        chmod,
        cancel,
        &mut TransferHooks::new(on_output),
    )
    .await
}

async fn upload_dir_inner<F>(
    sftp: &russh_sftp::client::SftpSession,
    src_dir: &Path,
    dest_dir: &Path,
    overwrite: bool,
    chmod: Option<&str>,
    cancel: Option<&CancellationToken>,
    hooks: &mut TransferHooks<'_, F>,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
{
    let mut result = TransferResult::zero();

    let mut entries = tokio::fs::read_dir(src_dir)
        .await
        .map_err(|e| format!("Error al leer directorio '{}': {}", src_dir.display(), e))?;

    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("Error leyendo entrada de directorio: {}", e))?
    {
        if cancelled(cancel) {
            return Err(CANCELLED_MSG.to_string());
        }

        let entry_path = entry.path();
        let file_name = entry.file_name();

        let dest_entry = join_remote_path(dest_dir, &file_name.to_string_lossy());

        if entry_path.is_dir() {
            let _ = sftp.create_dir(dest_entry.to_str().unwrap_or("")).await;

            let sub = Box::pin(upload_dir_inner(
                sftp,
                &entry_path,
                &dest_entry,
                overwrite,
                chmod,
                cancel,
                hooks,
            ))
            .await?;
            result.add(sub);
        } else {
            let sub = upload_single_file_inner(
                sftp,
                &entry_path,
                &dest_entry,
                overwrite,
                chmod,
                cancel,
                hooks,
            )
            .await?;
            result.add(sub);
        }
    }

    Ok(result)
}

/// Sube un archivo o directorio local (`src`) a la ruta remota `dest`.
/// Si `src` es un directorio, la transferencia es recursiva.
pub async fn upload<F>(
    sftp: &russh_sftp::client::SftpSession,
    src: &Path,
    dest: &Path,
    overwrite: bool,
    chmod: Option<&str>,
    cancel: Option<&CancellationToken>,
    on_output: &mut F,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
{
    upload_inner(
        sftp,
        src,
        dest,
        overwrite,
        chmod,
        cancel,
        &mut TransferHooks::new(on_output),
    )
    .await
}

async fn upload_inner<F>(
    sftp: &russh_sftp::client::SftpSession,
    src: &Path,
    dest: &Path,
    overwrite: bool,
    chmod: Option<&str>,
    cancel: Option<&CancellationToken>,
    hooks: &mut TransferHooks<'_, F>,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
{
    if src.is_dir() {
        upload_dir_inner(sftp, src, dest, overwrite, chmod, cancel, hooks).await
    } else {
        upload_single_file_inner(sftp, src, dest, overwrite, chmod, cancel, hooks).await
    }
}

/// Variante del gestor de archivos: respeta `recursive` y notifica el detalle
/// de cada archivo a través de `on_file_event`.
pub async fn upload_with_progress<F, B>(
    sftp: &russh_sftp::client::SftpSession,
    src: &Path,
    dest: &Path,
    overwrite: bool,
    chmod: Option<&str>,
    recursive: Option<bool>,
    cancel: Option<&CancellationToken>,
    on_output: &mut F,
    on_file_event: &mut B,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
    B: FnMut(FileTransferEvent) + Send,
{
    let mut hooks = TransferHooks::new(on_output);
    hooks.on_file_event = Some(on_file_event);

    match recursive {
        Some(true) => {
            upload_dir_inner(sftp, src, dest, overwrite, chmod, cancel, &mut hooks).await
        }
        Some(false) => {
            upload_single_file_inner(sftp, src, dest, overwrite, chmod, cancel, &mut hooks).await
        }
        None => upload_inner(sftp, src, dest, overwrite, chmod, cancel, &mut hooks).await,
    }
}

// ── Descargas ────────────────────────────────────────────────────────────────

/// Descarga un archivo remoto a una ruta local.
pub async fn download_single_file<F>(
    sftp: &russh_sftp::client::SftpSession,
    src: &Path,
    dest: &Path,
    overwrite: bool,
    cancel: Option<&CancellationToken>,
    on_output: &mut F,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
{
    download_single_file_inner(
        sftp,
        src,
        dest,
        overwrite,
        cancel,
        &mut TransferHooks::new(on_output),
    )
    .await
}

async fn download_single_file_inner<F>(
    sftp: &russh_sftp::client::SftpSession,
    src: &Path,
    dest: &Path,
    overwrite: bool,
    cancel: Option<&CancellationToken>,
    hooks: &mut TransferHooks<'_, F>,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
{
    let src_str = src.to_string_lossy();
    let dest_str = dest.to_string_lossy();

    if !overwrite && dest.exists() {
        let msg = format!("↷ Omitido (ya existe, overwrite=false): {}", dest_str);
        (hooks.on_output)(&msg);
        hooks.file_started(&src_str, 0);
        hooks.file_finished(&src_str, 0);
        return Ok(TransferResult::zero());
    }

    let msg = format!("Descargando: {} → {}", src_str, dest_str);
    (hooks.on_output)(&msg);

    let mut remote_file = sftp
        .open(src_str.as_ref())
        .await
        .map_err(|e| format!("No se pudo abrir '{}' en servidor: {}", src_str, e))?;

    let declared_size = sftp
        .metadata(src_str.as_ref())
        .await
        .map(|m| m.len())
        .unwrap_or(0);
    hooks.file_started(&src_str, declared_size);

    if let Some(parent) = dest.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Error al crear directorios locales: {}", e))?;
    }

    let mut local_file = tokio::fs::File::create(dest)
        .await
        .map_err(|e| format!("No se pudo crear '{}': {}", dest_str, e))?;

    let mut buf = vec![0u8; SFTP_BUFFER_SIZE];
    let mut transferred = 0u64;
    loop {
        if cancelled(cancel) {
            // No dejar un archivo local a medias tras cancelar.
            drop(local_file);
            let _ = tokio::fs::remove_file(dest).await;
            hooks.file_cancelled(&src_str, transferred);
            return Err(CANCELLED_MSG.to_string());
        }

        let read = match remote_file.read(&mut buf).await {
            Ok(read) => read,
            Err(e) => {
                // Abrir un directorio con O_RDONLY suele funcionar y fallar al
                // leer, devolviendo un críptico "Failure: Failure".
                let hint = match sftp.metadata(src_str.as_ref()).await {
                    Ok(metadata) if metadata.file_type().is_dir() => {
                        format!(" '{}' es un directorio; elige el modo Directorio.", src_str)
                    }
                    _ => String::new(),
                };
                return Err(format!(
                    "Error al leer '{}' del servidor: {}.{}",
                    src_str, e, hint
                ));
            }
        };
        if read == 0 {
            break;
        }

        local_file
            .write_all(&buf[..read])
            .await
            .map_err(|e| format!("Error al escribir '{}': {}", dest_str, e))?;

        transferred += read as u64;
        hooks.file_bytes(&src_str, transferred);
    }

    let done_msg = format!("✓ {} ({} bytes)", dest_str, transferred);
    (hooks.on_output)(&done_msg);
    hooks.file_finished(&src_str, transferred);

    Ok(TransferResult {
        bytes_transferred: transferred,
        files_transferred: 1,
    })
}

/// Si `path` es un enlace simbólico, devuelve su destino real (`realpath`).
///
/// `LSTAT` detecta el enlace y `STAT`+`realpath` lo resuelven. Algunos
/// servidores SFTP no siguen enlaces en `OPENDIR`, así que descargar el
/// contenido exige usar la ruta resuelta. Si algo falla se devuelve la ruta
/// original y se intenta igualmente.
async fn resolve_remote_symlink(sftp: &russh_sftp::client::SftpSession, path: &Path) -> PathBuf {
    let path_str = path.to_string_lossy();

    let is_symlink = sftp
        .symlink_metadata(path_str.as_ref())
        .await
        .map(|metadata| metadata.file_type().is_symlink())
        .unwrap_or(false);

    if !is_symlink {
        return path.to_path_buf();
    }

    match sftp.canonicalize(path_str.as_ref()).await {
        Ok(real_path) => PathBuf::from(real_path),
        Err(_) => path.to_path_buf(),
    }
}

/// Descarga un directorio remoto a una ruta local de forma recursiva.
pub async fn download_dir<F>(
    sftp: &russh_sftp::client::SftpSession,
    src_dir: &Path,
    dest_dir: &Path,
    overwrite: bool,
    cancel: Option<&CancellationToken>,
    on_output: &mut F,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
{
    download_dir_inner(
        sftp,
        src_dir,
        dest_dir,
        overwrite,
        cancel,
        &mut TransferHooks::new(on_output),
        0,
    )
    .await
}

/// Implementación recursiva con control de profundidad para cortar ciclos de
/// enlaces simbólicos (`current -> releases/…` que a su vez apunta al padre).
async fn download_dir_inner<F>(
    sftp: &russh_sftp::client::SftpSession,
    src_dir: &Path,
    dest_dir: &Path,
    overwrite: bool,
    cancel: Option<&CancellationToken>,
    hooks: &mut TransferHooks<'_, F>,
    depth: usize,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
{
    if depth >= MAX_DOWNLOAD_DEPTH {
        return Err(format!(
            "Profundidad máxima de descarga ({}) alcanzada en '{}'; revisa los enlaces simbólicos (posible ciclo)",
            MAX_DOWNLOAD_DEPTH,
            src_dir.to_string_lossy()
        ));
    }

    let mut result = TransferResult::zero();

    // `read_dir` no sigue enlaces en todos los servidores: usar la ruta real.
    let resolved_src = resolve_remote_symlink(sftp, src_dir).await;
    let src_str = resolved_src.to_string_lossy().to_string();

    let entries = sftp
        .read_dir(&src_str)
        .await
        .map_err(|e| format!("Error al leer directorio remoto '{}': {}", src_str, e))?;

    tokio::fs::create_dir_all(dest_dir).await.map_err(|e| {
        format!(
            "Error al crear directorio local '{}': {}",
            dest_dir.display(),
            e
        )
    })?;

    for entry in entries {
        if cancelled(cancel) {
            return Err(CANCELLED_MSG.to_string());
        }

        let file_name = entry.file_name();

        // `DirEntry::path()` ya une con `/`, como exige el protocolo SFTP.
        let entry_path = entry.path();
        let entry_src = PathBuf::from(&entry_path);
        let entry_dest = dest_dir.join(&file_name);

        let file_type = entry.file_type();

        // `file_type()` usa LSTAT: un enlace nunca es `is_dir()`, aunque
        // apunte a un directorio. STAT (`metadata`) sí lo resuelve.
        let is_dir = if file_type.is_symlink() {
            match sftp.metadata(&entry_path).await {
                Ok(resolved) => resolved.file_type().is_dir(),
                Err(_) => {
                    let msg = format!("⚠ Omitido enlace simbólico inaccesible: {}", entry_path);
                    (hooks.on_output)(&msg);
                    continue;
                }
            }
        } else {
            file_type.is_dir()
        };

        if is_dir {
            let sub = Box::pin(download_dir_inner(
                sftp,
                &entry_src,
                &entry_dest,
                overwrite,
                cancel,
                hooks,
                depth + 1,
            ))
            .await?;
            result.add(sub);
        } else {
            let sub = download_single_file_inner(
                sftp, &entry_src, &entry_dest, overwrite, cancel, hooks,
            )
            .await?;
            result.add(sub);
        }
    }

    Ok(result)
}

/// Descarga un archivo o directorio remoto (`src`) a la ruta local `dest`.
/// Detecta si `src` es un directorio con STAT, que sigue enlaces simbólicos;
/// solo si STAT no está disponible se recurre a probar `read_dir`.
pub async fn download<F>(
    sftp: &russh_sftp::client::SftpSession,
    src: &Path,
    dest: &Path,
    overwrite: bool,
    cancel: Option<&CancellationToken>,
    on_output: &mut F,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
{
    download_inner(
        sftp,
        src,
        dest,
        overwrite,
        cancel,
        &mut TransferHooks::new(on_output),
    )
    .await
}

async fn download_inner<F>(
    sftp: &russh_sftp::client::SftpSession,
    src: &Path,
    dest: &Path,
    overwrite: bool,
    cancel: Option<&CancellationToken>,
    hooks: &mut TransferHooks<'_, F>,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
{
    let src_str = src.to_string_lossy();

    let is_dir = match sftp.metadata(src_str.as_ref()).await {
        Ok(metadata) => metadata.file_type().is_dir(),
        // Servidor sin STAT: se intenta `read_dir` como detección antigua.
        Err(_) => sftp.read_dir(src_str.as_ref()).await.is_ok(),
    };

    if is_dir {
        download_dir_inner(sftp, src, dest, overwrite, cancel, hooks, 0).await
    } else {
        download_single_file_inner(sftp, src, dest, overwrite, cancel, hooks).await
    }
}

/// Variante del gestor de archivos: respeta `recursive` y notifica el detalle
/// de cada archivo a través de `on_file_event`.
pub async fn download_with_progress<F, B>(
    sftp: &russh_sftp::client::SftpSession,
    src: &Path,
    dest: &Path,
    overwrite: bool,
    recursive: Option<bool>,
    cancel: Option<&CancellationToken>,
    on_output: &mut F,
    on_file_event: &mut B,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
    B: FnMut(FileTransferEvent) + Send,
{
    let mut hooks = TransferHooks::new(on_output);
    hooks.on_file_event = Some(on_file_event);

    match recursive {
        Some(true) => {
            download_dir_inner(sftp, src, dest, overwrite, cancel, &mut hooks, 0).await
        }
        Some(false) => {
            download_single_file_inner(sftp, src, dest, overwrite, cancel, &mut hooks).await
        }
        None => download_inner(sftp, src, dest, overwrite, cancel, &mut hooks).await,
    }
}

// ── Pre-listado recursivo ────────────────────────────────────────────────────

fn make_file_info(path: String, relative_path: String, size: u64, kind: &str) -> RemoteTransferFileInfo {
    RemoteTransferFileInfo {
        id: String::new(),
        path,
        relative_path,
        size,
        kind: kind.to_string(),
    }
}

fn assign_file_ids(files: &mut [RemoteTransferFileInfo]) {
    for (index, file) in files.iter_mut().enumerate() {
        file.id = index.to_string();
    }
}

fn file_name_of(path: &Path) -> String {
    path.file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string())
}

/// Enumera recursivamente el origen remoto con la misma política que
/// `download_dir_inner`: resuelve symlinks, omite enlaces inaccesibles y corta
/// ciclos con `MAX_DOWNLOAD_DEPTH`.
pub async fn list_remote_files(
    sftp: &russh_sftp::client::SftpSession,
    src: &Path,
    depth: usize,
) -> Result<Vec<RemoteTransferFileInfo>, String> {
    if depth >= MAX_DOWNLOAD_DEPTH {
        return Err(format!(
            "Profundidad máxima de listado ({}) alcanzada en '{}'; revisa los enlaces simbólicos (posible ciclo)",
            MAX_DOWNLOAD_DEPTH,
            src.to_string_lossy()
        ));
    }

    let resolved = resolve_remote_symlink(sftp, src).await;
    let src_str = resolved.to_string_lossy();
    let metadata = sftp
        .metadata(src_str.as_ref())
        .await
        .map_err(|e| format!("No se pudo inspeccionar '{}' en servidor: {}", src_str, e))?;

    let mut files = Vec::new();

    if !metadata.file_type().is_dir() {
        files.push(make_file_info(
            src.to_string_lossy().to_string(),
            file_name_of(src),
            metadata.len(),
            "file",
        ));
        assign_file_ids(&mut files);
        return Ok(files);
    }

    let entries = sftp
        .read_dir(src_str.as_ref())
        .await
        .map_err(|e| format!("Error al leer directorio remoto '{}': {}", src_str, e))?;

    for entry in entries {
        let name = entry.file_name();
        let entry_path = entry.path();
        let file_type = entry.file_type();

        let is_dir = if file_type.is_symlink() {
            match sftp.metadata(&entry_path).await {
                Ok(resolved) => resolved.file_type().is_dir(),
                // Enlace roto: la descarga también lo omite.
                Err(_) => continue,
            }
        } else {
            file_type.is_dir()
        };

        if is_dir {
            let mut sub = Box::pin(list_remote_files(
                sftp,
                &PathBuf::from(&entry_path),
                depth + 1,
            ))
            .await?;
            for file in &mut sub {
                file.relative_path = format!("{}/{}", name, file.relative_path);
            }
            files.extend(sub);
        } else {
            let size = sftp
                .metadata(&entry_path)
                .await
                .map(|m| m.len())
                .unwrap_or(0);
            let kind = if file_type.is_symlink() {
                "symlink"
            } else {
                "file"
            };
            files.push(make_file_info(entry_path.clone(), name.clone(), size, kind));
        }
    }

    assign_file_ids(&mut files);
    Ok(files)
}

/// Enumera recursivamente un origen local con la misma política que
/// `upload_dir`: omite enlaces rotos y usa `/` en las rutas relativas de la UI.
pub async fn list_local_files(src: &Path) -> Result<Vec<RemoteTransferFileInfo>, String> {
    let mut files = Vec::new();

    if src.is_dir() {
        list_local_dir(src, "", &mut files).await?;
    } else {
        let metadata = tokio::fs::metadata(src)
            .await
            .map_err(|e| format!("No se pudo inspeccionar '{}': {}", src.display(), e))?;
        files.push(make_file_info(
            src.to_string_lossy().to_string(),
            file_name_of(src),
            metadata.len(),
            "file",
        ));
    }

    assign_file_ids(&mut files);
    Ok(files)
}

async fn list_local_dir(
    dir: &Path,
    prefix: &str,
    out: &mut Vec<RemoteTransferFileInfo>,
) -> Result<(), String> {
    let mut entries = tokio::fs::read_dir(dir)
        .await
        .map_err(|e| format!("Error al leer directorio '{}': {}", dir.display(), e))?;

    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("Error leyendo entrada de directorio: {}", e))?
    {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let relative = if prefix.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", prefix, name)
        };

        // Igual que `upload_dir_inner`: `file_type()` usa LSTAT, así que un
        // enlace a directorio se trata como archivo y no se recursiona.
        let file_type = entry.file_type().await.map_err(|e| {
            format!("Error leyendo tipo de '{}': {}", path.display(), e)
        })?;

        if file_type.is_dir() {
            Box::pin(list_local_dir(&path, &relative, out)).await?;
        } else {
            // `File::open` sigue el enlace al subir; si está roto se omite.
            let metadata = match tokio::fs::metadata(&path).await {
                Ok(metadata) => metadata,
                Err(_) => continue,
            };
            out.push(make_file_info(
                path.to_string_lossy().to_string(),
                relative,
                metadata.len(),
                if file_type.is_symlink() { "symlink" } else { "file" },
            ));
        }
    }

    Ok(())
}

// ── Helper interno ───────────────────────────────────────────────────────────

/// Aplica `chmod` (permisos octales, ej. "755") al archivo remoto recién
/// subido. No es fatal si falla (el servidor puede no soportarlo, o el
/// usuario SSH no tener permisos): se registra como aviso en el output y se
/// continúa con la transferencia.
async fn apply_chmod<F>(
    sftp: &russh_sftp::client::SftpSession,
    remote_path: &str,
    chmod: &str,
    on_output: &mut F,
) where
    F: FnMut(&str),
{
    let mode = match u32::from_str_radix(chmod, 8) {
        Ok(m) => m,
        Err(_) => {
            let msg = format!(
                "⚠ chmod '{}' inválido para '{}' (se esperaba octal, ej. 755)",
                chmod, remote_path
            );
            on_output(&msg);
            return;
        }
    };

    let attrs = russh_sftp::protocol::FileAttributes {
        permissions: Some(mode),
        ..Default::default()
    };

    if let Err(e) = sftp.set_metadata(remote_path, attrs).await {
        let msg = format!(
            "⚠ No se pudo aplicar chmod {} a '{}': {}",
            chmod, remote_path, e
        );
        on_output(&msg);
    }
}
