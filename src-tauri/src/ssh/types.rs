use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

// ============================================================================
// Inputs de los comandos de consola remota
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct RemoteCommandInput {
    pub host_id: i64,
    /// Comando a ejecutar en el servidor.
    pub command: String,
    /// Directorio remoto desde el que ejecutar (opcional).
    pub working_dir: Option<String>,
    /// Timeout de ejecución en segundos. Por defecto: 300.
    pub timeout_secs: Option<u64>,
    /// Número máximo de intentos de reconexión SSH si la sesión cae. Por defecto: 3.
    pub ssh_reconnect_attempts: Option<u32>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct RemoteUploadInput {
    pub host_id: i64,
    /// Ruta local del archivo o directorio a subir.
    pub local_path: String,
    /// Ruta remota de destino.
    pub remote_path: String,
    /// Sobrescribir si el destino ya existe. Por defecto: true.
    pub overwrite: Option<bool>,
    /// Permisos octales a aplicar al archivo subido (ej. "755"). Solo aplica a archivos.
    pub chmod: Option<String>,
    /// Forzar tratamiento como directorio. Si es None/Some(false) se auto-detecta
    /// según el tipo de `local_path`.
    pub recursive: Option<bool>,
    /// Número máximo de intentos de reconexión SSH si la sesión cae. Por defecto: 3.
    pub ssh_reconnect_attempts: Option<u32>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct RemoteDownloadInput {
    pub host_id: i64,
    /// Ruta remota del archivo o directorio a descargar.
    pub remote_path: String,
    /// Ruta local donde guardar. Si es None, se devuelve el contenido en base64
    /// (solo archivos simples).
    pub local_path: Option<String>,
    /// Sobrescribir si el destino ya existe. Por defecto: true.
    pub overwrite: Option<bool>,
    /// Si true, descarga `remote_path` como directorio de forma recursiva.
    pub recursive: Option<bool>,
    /// Número máximo de intentos de reconexión SSH si la sesión cae. Por defecto: 3.
    pub ssh_reconnect_attempts: Option<u32>,
}

/// Petición de listado de **un solo nivel** de un directorio remoto.
#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct RemoteListInput {
    pub host_id: i64,
    /// Directorio remoto a listar. Si está vacío, se usa `/`.
    pub path: String,
    /// Número máximo de intentos de reconexión SSH si la sesión cae. Por defecto: 3.
    pub ssh_reconnect_attempts: Option<u32>,
    /// Tope de entradas devueltas. Por defecto: 1000.
    pub max_entries: Option<u32>,
}

// ============================================================================
// Resultados
// ============================================================================

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct RemoteCommandResult {
    pub exit_code: i64,
    pub output: String,
    pub duration_seconds: i64,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct RemoteTransferResult {
    pub bytes_transferred: u64,
    pub files_transferred: u32,
    pub duration_seconds: i64,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct RemoteDownloadResult {
    /// Contenido del archivo descargado en base64 (solo si no se indicó `local_path`).
    pub content_base64: Option<String>,
    /// Ruta local donde se guardó el archivo (si se indicó `local_path`).
    pub saved_to: Option<String>,
    pub bytes_transferred: u64,
    pub files_transferred: u32,
    pub duration_seconds: i64,
}

/// Tipo de una entrada remota, según lo informado por SFTP.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "tauri-types.d.ts")]
pub enum RemoteEntryKind {
    File,
    Dir,
    Symlink,
    Other,
}

/// Una entrada de un directorio remoto (sin recursión).
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct RemoteEntry {
    pub name: String,
    /// Ruta remota construida siempre con `/`.
    pub path: String,
    pub kind: RemoteEntryKind,
    /// Tamaño en bytes; `0` si el servidor no lo informa.
    pub size: u64,
    /// Última modificación como timestamp Unix en segundos.
    pub modified: Option<i64>,
    /// Permisos en notación simbólica (p. ej. `rwxr-xr-x`).
    pub permissions: Option<String>,
    /// Destino del enlace simbólico, si se pudo resolver.
    pub target: Option<String>,
    /// Tipo del destino del enlace (`dir` / `file`), si se pudo resolver.
    /// `None` en entradas que no son symlinks o cuyo destino está roto.
    pub target_kind: Option<String>,
}

/// Contenido de un único nivel de un directorio remoto.
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct RemoteListing {
    /// Directorio listado, normalizado.
    pub path: String,
    pub entries: Vec<RemoteEntry>,
    /// `true` si se alcanzó `max_entries` y podrían quedar más entradas.
    pub truncated: bool,
}

// ============================================================================
// Eventos de la consola remota (Channel opcional)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "tauri-types.d.ts")]
pub enum RemoteFinishStatus {
    Success,
    Error,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "event", rename_all = "snake_case")]
#[ts(export, export_to = "tauri-types.d.ts")]
pub enum RemoteConsoleEvent {
    /// Job registrado en el backend; su id permite cancelarlo de forma selectiva.
    Started { job_id: u64 },
    /// Fragmento de output acumulado del comando o de la transferencia.
    OutputChunk { chunk: String },
    /// Operación finalizada con su estado real (éxito, error o cancelación).
    Finished {
        status: RemoteFinishStatus,
        exit_code: i64,
        duration_seconds: i64,
        /// Mensaje de error/cancelación cuando aplica; `null` en éxito.
        message: Option<String>,
    },
    /// Error de nivel de transporte/transferencia. Se mantiene por compatibilidad;
    /// el estado terminal canónico viaja en `Finished`.
    Error { message: String },
}

// ============================================================================
// Gestor de archivos: lote de transferencias ( Channel<RemoteFileManagerEvent> )
// ============================================================================

/// Dirección de una transferencia dentro de un lote.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "tauri-types.d.ts")]
pub enum RemoteTransferDirection {
    Upload,
    Download,
}

/// Un ítem del lote. `key` es la clave de cliente del job del frontend, no el
/// `job_id` de Rust (que se entrega en el evento `item_started`).
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct RemoteTransferItemInput {
    pub key: String,
    pub direction: RemoteTransferDirection,
    /// Ruta local: origen al subir, destino al descargar.
    pub local_path: String,
    /// Ruta remota: destino al subir, origen al descargar.
    pub remote_path: String,
    /// Sobrescribir si el destino ya existe. Por defecto: true.
    pub overwrite: Option<bool>,
    /// Permisos octales a aplicar al subir archivos (ej. "755").
    pub chmod: Option<String>,
    /// Some(true)/Some(false) fuerzan directorio/archivo; None autodetecta.
    pub recursive: Option<bool>,
}

/// Petición de un lote completo. Todas las transferencias comparten una sola
/// conexión SSH/SFTP; como máximo `max_concurrency` ítems están en curso a la vez.
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct RemoteTransferBatchInput {
    pub host_id: i64,
    /// Número máximo de intentos de reconexión SSH. Por defecto: 3.
    pub ssh_reconnect_attempts: Option<u32>,
    /// Número máximo de ítems simultáneos; ausente o `null` → 2, rango 1-16.
    #[serde(default)]
    pub max_concurrency: Option<u32>,
    pub items: Vec<RemoteTransferItemInput>,
}

/// Resultado de un ítem del lote.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct RemoteTransferItemResult {
    pub key: String,
    pub status: RemoteFinishStatus,
    pub bytes_transferred: u64,
    pub files_transferred: u32,
    pub duration_seconds: i64,
    /// Mensaje legible de error/cancelación cuando aplica; `null` en éxito.
    pub message: Option<String>,
    /// Clave i18n del error del ítem; vacía en éxito.
    pub message_key: String,
    /// Parámetros de la clave i18n del error.
    pub message_params: HashMap<String, String>,
    /// Líneas de progreso acumuladas por `transfer.rs` durante el ítem.
    pub output: String,
}

/// Resultado agregado del lote, con el detalle de cada ítem.
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct RemoteBatchResult {
    pub items: Vec<RemoteTransferItemResult>,
    pub bytes_transferred: u64,
    pub files_transferred: u32,
    pub duration_seconds: i64,
}

/// Un archivo descubierto en el pre-listado recursivo de un ítem.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct RemoteTransferFileInfo {
    /// Identificador estable dentro del ítem (índice secuencial).
    pub id: String,
    /// Ruta completa del archivo; correlaciona los eventos de bytes con el `id`.
    pub path: String,
    /// Ruta legible relativa al origen del ítem.
    pub relative_path: String,
    /// Tamaño en bytes informado por el origen.
    pub size: u64,
    /// Tipo de entrada en el origen (`file`, `symlink`, …).
    pub kind: String,
}

/// Eventos del gestor de archivos. No sustituyen a `RemoteConsoleEvent`: la
/// consola actual sigue usando su propio `Channel`.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "event", rename_all = "snake_case")]
#[ts(export, export_to = "tauri-types.d.ts")]
pub enum RemoteFileManagerEvent {
    /// Lote aceptado; `total` es el número de ítems y `job_ids` asocia la clave
    /// de cada ítem con su token de cancelación (registrados todos al inicio).
    BatchStarted {
        total: u32,
        job_ids: HashMap<String, u64>,
    },
    /// ítem en curso, con el `job_id` que permite cancelarlo de forma selectiva.
    ItemStarted { key: String, job_id: u64 },
    /// Lista recursiva completa del origen, emitida antes de transferir.
    FileList {
        key: String,
        files: Vec<RemoteTransferFileInfo>,
        total_bytes: u64,
        total_files: u32,
    },
    /// Un archivo concreto empieza a transferirse.
    FileStarted { key: String, file_id: String, path: String, bytes: u64 },
    /// Bytes acumulados de un archivo; el productor limita la frecuencia.
    FileProgress { key: String, file_id: String, bytes: u64, total: u64 },
    /// Un archivo concreto termina (o se cancela).
    FileFinished {
        key: String,
        file_id: String,
        bytes: u64,
        status: RemoteFinishStatus,
        /// Clave i18n del fallo, si este archivo concreto falló.
        message_key: Option<String>,
    },
    /// Avance al completar un ítem: `bytes` son los bytes de ese ítem y `total`
    /// el acumulado del lote hasta ese momento. No es un streaming byte a byte.
    Progress { key: String, bytes: u64, total: u64 },
    /// Estado terminal del ítem, con su resultado detallado.
    ItemFinished {
        key: String,
        status: RemoteFinishStatus,
        result: RemoteTransferItemResult,
    },
    /// Cierre del lote con el recuento de estados terminales.
    BatchFinished {
        succeeded: u32,
        failed: u32,
        cancelled: u32,
        duration_seconds: i64,
    },
}
