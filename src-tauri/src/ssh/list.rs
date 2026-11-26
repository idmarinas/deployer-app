//! Listado de un único nivel de un directorio remoto por SFTP.
//!
//! No se persiste nada en SQLite: el comando abre una sesión SFTP, lee el
//! directorio pedido y devuelve las entradas ya tipadas al frontend. Los
//! archivos ocultos **no** se filtran (se muestran por defecto).

use std::path::Path;
use std::time::UNIX_EPOCH;
use tauri::AppHandle;

use crate::response::CommandResponse;
use crate::ssh::error::err_response;
use crate::ssh::transfer::join_remote_path;
use crate::ssh::types::{RemoteEntry, RemoteEntryKind, RemoteListInput, RemoteListing};
use crate::ssh::{connect_to_host_by_id, keys, open_sftp_session, SshError};
use russh_sftp::client::fs::DirEntry;
use russh_sftp::client::SftpSession;

/// Tope por defecto cuando el frontend no envía `max_entries`.
const DEFAULT_MAX_ENTRIES: u32 = 1000;

/// Lista **solo el nivel** indicado por `input.path`, sin recursión.
///
/// Las rutas devueltas usan siempre `/`, los enlaces simbólicos se clasifican
/// sin abortar el listado aunque estén rotos y se informa del tipo de su
/// destino cuando se puede resolver. Las entradas se devuelven en orden de
/// llegada: el criterio de orden lo impone el frontend.
#[tauri::command]
pub async fn ssh_list_remote_dir(
    app: AppHandle,
    input: RemoteListInput,
) -> Result<CommandResponse<RemoteListing>, String> {
    let (mut session, _host) = match connect_to_host_by_id(
        &app,
        input.host_id,
        input.ssh_reconnect_attempts.unwrap_or(3),
        true,
    )
    .await
    {
        Ok(v) => v,
        Err(e) => return err_response(e),
    };

    if let Err(e) = session.ensure_connected().await {
        let _ = session.disconnect().await;
        return err_response(e);
    }

    let sftp = match open_sftp_session(&mut session).await {
        Ok(s) => s,
        Err(e) => {
            let _ = session.disconnect().await;
            return err_response(SshError::transfer_failed(e));
        }
    };

    let normalized_path = normalize_remote_path(&input.path);
    let limit = input.max_entries.unwrap_or(DEFAULT_MAX_ENTRIES).max(1) as usize;

    let result = list_level(&sftp, &normalized_path, limit).await;

    let _ = session.disconnect().await;

    match result {
        Ok(listing) => Ok(CommandResponse::ok(listing, keys::LIST_OK)),
        Err(reason) => err_response(SshError::transfer_failed(reason)),
    }
}

/// Normaliza una ruta remota: separadores `/`, sin duplicados ni barra final
/// (salvo la raíz). Vacía → `/`.
fn normalize_remote_path(path: &str) -> String {
    let trimmed = path.trim();
    let absolute = trimmed.starts_with('/') || trimmed.starts_with('\\');
    let replaced = trimmed.replace('\\', "/");
    let parts: Vec<&str> = replaced
        .split('/')
        .filter(|part| !part.is_empty())
        .collect();

    if parts.is_empty() {
        return "/".to_string();
    }

    let joined = parts.join("/");
    if absolute {
        format!("/{joined}")
    } else {
        joined
    }
}

async fn list_level(
    sftp: &SftpSession,
    path: &str,
    limit: usize,
) -> Result<RemoteListing, String> {
    let read_dir = sftp
        .read_dir(path)
        .await
        .map_err(|e| format!("No se pudo listar '{}': {}", path, e))?;

    let mut entries = Vec::new();
    let mut truncated = false;

    for entry in read_dir {
        if entries.len() >= limit {
            truncated = true;
            break;
        }
        entries.push(build_entry(sftp, entry, path).await);
    }

    Ok(RemoteListing {
        path: path.to_string(),
        entries,
        truncated,
    })
}

async fn build_entry(sftp: &SftpSession, entry: DirEntry, base_dir: &str) -> RemoteEntry {
    let name = entry.file_name();
    let raw_path = entry.path();
    let path = normalize_remote_path(&raw_path);
    let file_type = entry.file_type();
    let metadata = entry.metadata();

    let kind = if file_type.is_dir() {
        RemoteEntryKind::Dir
    } else if file_type.is_symlink() {
        RemoteEntryKind::Symlink
    } else if file_type.is_file() {
        RemoteEntryKind::File
    } else {
        RemoteEntryKind::Other
    };

    let modified = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs() as i64);

    let permissions = metadata
        .permissions
        .map(|_| metadata.permissions().to_string());

    let target = if kind == RemoteEntryKind::Symlink {
        resolve_symlink_target(sftp, &path, base_dir).await
    } else {
        None
    };

    // STAT sigue el enlace: solo cuesta una petición por symlink resuelto y
    // un destino roto o inaccesible se deja como `None` sin romper el listado.
    let target_kind = if let Some(target) = &target {
        match sftp.metadata(target.as_str()).await {
            Ok(resolved) if resolved.file_type().is_dir() => Some("dir".to_string()),
            Ok(resolved) if resolved.file_type().is_file() => Some("file".to_string()),
            _ => None,
        }
    } else {
        None
    };

    RemoteEntry {
        name,
        path,
        kind,
        size: metadata.len(),
        modified,
        permissions,
        target,
        target_kind,
    }
}

/// Devuelve el destino de un enlace simbólico. Se prefiere la ruta
/// canónica; si está roto o no se puede resolver, se conserva el texto leído
/// del enlace (haciéndolo absoluto con `join_remote_path` si era relativo).
async fn resolve_symlink_target(sftp: &SftpSession, path: &str, base_dir: &str) -> Option<String> {
    if let Ok(canonical) = sftp.canonicalize(path).await {
        return Some(canonical);
    }

    match sftp.read_link(path).await {
        Ok(link) if link.starts_with('/') => Some(normalize_remote_path(&link)),
        Ok(link) => Some(
            join_remote_path(Path::new(base_dir), &link)
                .to_string_lossy()
                .into_owned(),
        ),
        Err(_) => None,
    }
}
