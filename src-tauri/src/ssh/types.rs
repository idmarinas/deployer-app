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

// ============================================================================
// Eventos de la consola remota (Channel opcional)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "event", rename_all = "snake_case")]
#[ts(export, export_to = "tauri-types.d.ts")]
pub enum RemoteConsoleEvent {
    /// Fragmento de output acumulado del comando o de la transferencia.
    OutputChunk { chunk: String },
    /// Operación finalizada; incluye el código de salida (si aplica).
    Finished {
        exit_code: i64,
        duration_seconds: i64,
    },
    /// Error de nivel de transporte (conexión, timeout, SFTP).
    Error { message: String },
}
