//! Utilidades SFTP genéricas, desacopladas del runner de deployments.
//!
//! Permiten subir/descargar archivos o directorios vía SFTP emitiendo
//! progreso por un callback genérico (`F: FnMut(&str)`). No dependen de
//! `ResolvedTask`, `ProgressEvent` ni `Channel`: cada caller decide cómo
//! consumir las líneas de output (acumularlas, enviarlas por un canal, etc.).

use std::path::{Path, PathBuf};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio_util::sync::CancellationToken;

use super::glob::matches_any;

/// Tamaño del buffer de lectura/escritura SFTP (256 KB).
const SFTP_BUFFER_SIZE: usize = 256 * 1024;

/// Mensaje devuelto cuando el usuario cancela la transferencia.
const CANCELLED_MSG: &str = "Operación cancelada por el usuario";

/// Devuelve `true` si el token de cancelación está activo (o si no hay token,
/// nunca cancela).
fn cancelled(cancel: Option<&CancellationToken>) -> bool {
    cancel.map(|c| c.is_cancelled()).unwrap_or(false)
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
    let src_str = src.to_string_lossy();
    let dest_str = dest.to_string_lossy();

    if !overwrite && sftp.metadata(dest_str.as_ref()).await.is_ok() {
        let msg = format!("↷ Omitido (ya existe, overwrite=false): {}", dest_str);
        on_output(&msg);
        return Ok(TransferResult::zero());
    }

    let msg = format!("Subiendo: {} → {}", src_str, dest_str);
    on_output(&msg);

    let mut local_file = tokio::fs::File::open(src)
        .await
        .map_err(|e| format!("No se pudo abrir '{}': {}", src_str, e))?;

    let file_size = local_file.metadata().await.map(|m| m.len()).unwrap_or(0);

    let mut buf = Vec::with_capacity(SFTP_BUFFER_SIZE);
    local_file
        .read_to_end(&mut buf)
        .await
        .map_err(|e| format!("Error al leer '{}': {}", src_str, e))?;

    if cancelled(cancel) {
        return Err(CANCELLED_MSG.to_string());
    }

    let mut remote_file = sftp
        .create(dest_str.as_ref())
        .await
        .map_err(|e| format!("Error al crear '{}' en servidor: {}", dest_str, e))?;

    remote_file
        .write_all(&buf)
        .await
        .map_err(|e| format!("Error al escribir en servidor: {}", e))?;

    remote_file
        .flush()
        .await
        .map_err(|e| format!("Error al hacer flush SFTP: {}", e))?;

    if let Some(mode) = chmod {
        apply_chmod(sftp, dest_str.as_ref(), mode, on_output).await;
    }

    let done_msg = format!("✓ {} ({} bytes)", src_str, file_size);
    on_output(&done_msg);

    Ok(TransferResult {
        bytes_transferred: file_size,
        files_transferred: 1,
    })
}

/// Sube un directorio local a una ruta remota de forma recursiva.
#[allow(clippy::too_many_arguments)]
pub async fn upload_dir<F>(
    sftp: &russh_sftp::client::SftpSession,
    src_dir: &Path,
    dest_dir: &Path,
    overwrite: bool,
    exclude: Option<&[String]>,
    chmod: Option<&str>,
    cancel: Option<&CancellationToken>,
    on_output: &mut F,
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
        let file_name_str = file_name.to_string_lossy();

        if let Some(patterns) = exclude {
            if matches_any(patterns, &file_name_str) {
                continue;
            }
        }

        let dest_entry = dest_dir.join(&file_name);

        if entry_path.is_dir() {
            let _ = sftp.create_dir(dest_entry.to_str().unwrap_or("")).await;

            let sub = Box::pin(upload_dir(
                sftp,
                &entry_path,
                &dest_entry,
                overwrite,
                exclude,
                chmod,
                cancel,
                on_output,
            ))
            .await?;
            result.add(sub);
        } else {
            let sub = upload_single_file(
                sftp,
                &entry_path,
                &dest_entry,
                overwrite,
                chmod,
                cancel,
                on_output,
            )
            .await?;
            result.add(sub);
        }
    }

    Ok(result)
}

/// Sube un archivo o directorio local (`src`) a la ruta remota `dest`.
/// Si `src` es un directorio, la transferencia es recursiva.
#[allow(clippy::too_many_arguments)]
pub async fn upload<F>(
    sftp: &russh_sftp::client::SftpSession,
    src: &Path,
    dest: &Path,
    overwrite: bool,
    exclude: Option<&[String]>,
    chmod: Option<&str>,
    cancel: Option<&CancellationToken>,
    on_output: &mut F,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
{
    if src.is_dir() {
        upload_dir(sftp, src, dest, overwrite, exclude, chmod, cancel, on_output).await
    } else {
        upload_single_file(sftp, src, dest, overwrite, chmod, cancel, on_output).await
    }
}

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
    let src_str = src.to_string_lossy();
    let dest_str = dest.to_string_lossy();

    if !overwrite && dest.exists() {
        let msg = format!("↷ Omitido (ya existe, overwrite=false): {}", dest_str);
        on_output(&msg);
        return Ok(TransferResult::zero());
    }

    let msg = format!("Descargando: {} → {}", src_str, dest_str);
    on_output(&msg);

    let mut remote_file = sftp
        .open(src_str.as_ref())
        .await
        .map_err(|e| format!("No se pudo abrir '{}' en servidor: {}", src_str, e))?;

    let mut buf = Vec::new();
    remote_file
        .read_to_end(&mut buf)
        .await
        .map_err(|e| format!("Error al leer '{}' del servidor: {}", src_str, e))?;

    let file_size = buf.len() as u64;

    if cancelled(cancel) {
        return Err(CANCELLED_MSG.to_string());
    }

    if let Some(parent) = dest.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Error al crear directorios locales: {}", e))?;
    }

    let mut local_file = tokio::fs::File::create(dest)
        .await
        .map_err(|e| format!("No se pudo crear '{}': {}", dest_str, e))?;

    local_file
        .write_all(&buf)
        .await
        .map_err(|e| format!("Error al escribir '{}': {}", dest_str, e))?;

    let done_msg = format!("✓ {} ({} bytes)", dest_str, file_size);
    on_output(&done_msg);

    Ok(TransferResult {
        bytes_transferred: file_size,
        files_transferred: 1,
    })
}

/// Descarga un directorio remoto a una ruta local de forma recursiva.
#[allow(clippy::too_many_arguments)]
pub async fn download_dir<F>(
    sftp: &russh_sftp::client::SftpSession,
    src_dir: &Path,
    dest_dir: &Path,
    overwrite: bool,
    exclude: Option<&[String]>,
    cancel: Option<&CancellationToken>,
    on_output: &mut F,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
{
    let mut result = TransferResult::zero();

    let src_str = src_dir.to_string_lossy().to_string();

    let entries = sftp
        .read_dir(&src_str)
        .await
        .map_err(|e| format!("Error al leer directorio remoto '{}': {}", src_str, e))?;

    tokio::fs::create_dir_all(dest_dir)
        .await
        .map_err(|e| format!("Error al crear directorio local '{}': {}", dest_dir.display(), e))?;

    for entry in entries {
        if cancelled(cancel) {
            return Err(CANCELLED_MSG.to_string());
        }

        let file_name = entry.file_name();

        if let Some(patterns) = exclude {
            if matches_any(patterns, &file_name) {
                continue;
            }
        }

        let entry_src = src_dir.join(&file_name);
        let entry_dest = dest_dir.join(&file_name);
        let is_dir = entry.file_type().is_dir();

        if is_dir {
            let sub = Box::pin(download_dir(
                sftp,
                &entry_src,
                &entry_dest,
                overwrite,
                exclude,
                cancel,
                on_output,
            ))
            .await?;
            result.add(sub);
        } else {
            let sub = download_single_file(sftp, &entry_src, &entry_dest, overwrite, cancel, on_output)
                .await?;
            result.add(sub);
        }
    }

    Ok(result)
}

/// Descarga un archivo o directorio remoto (`src`) a la ruta local `dest`.
/// Detecta si `src` es un directorio remoto probando `read_dir`.
#[allow(clippy::too_many_arguments)]
pub async fn download<F>(
    sftp: &russh_sftp::client::SftpSession,
    src: &Path,
    dest: &Path,
    overwrite: bool,
    exclude: Option<&[String]>,
    cancel: Option<&CancellationToken>,
    on_output: &mut F,
) -> Result<TransferResult, String>
where
    F: FnMut(&str),
{
    let src_str = src.to_string_lossy();

    let is_dir = match sftp.read_dir(src_str.as_ref()).await {
        Ok(_) => true,
        Err(_) => false,
    };

    if is_dir {
        download_dir(sftp, src, dest, overwrite, exclude, cancel, on_output).await
    } else {
        download_single_file(sftp, src, dest, overwrite, cancel, on_output).await
    }
}

/// Resuelve una ruta contra un working dir si es relativa.
pub fn resolve_path(path: &str, working_dir: Option<&str>) -> PathBuf {
    let p = Path::new(path);
    if p.is_absolute() {
        p.to_path_buf()
    } else if let Some(wd) = working_dir {
        Path::new(wd).join(p)
    } else {
        p.to_path_buf()
    }
}

// ── Helpers internos ──────────────────────────────────────────────────────────

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
