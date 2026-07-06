use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::commands::Patch;

// ============================================================================
// TaskConfig — configuración específica por TaskType, serializada como JSON
// en project_tasks.config
// ============================================================================

/// Un mapeo individual origen -> destino dentro de una transferencia de
/// archivos. Una `FileTransferConfig` contiene una lista de estos, lo que
/// permite representar con la misma estructura:
/// - 1 archivo suelto -> `paths` con 1 elemento, `recursive: false`.
/// - Varios archivos sueltos -> `paths` con N elementos (cada uno su propio
///   src/dest, ya que pueden ir a destinos distintos).
/// - 1 directorio completo -> `paths` con 1 elemento, `recursive: true`.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct PathMapping {
    /// Ruta de origen.
    /// - UploadFile: ruta local en el PC del usuario (absoluta o relativa a local_working_dir).
    /// - DownloadFile: ruta remota en el servidor (absoluta o relativa a remote_working_dir).
    pub src: String,
    /// Ruta de destino.
    /// - UploadFile: ruta remota en el servidor (absoluta o relativa a remote_working_dir).
    /// - DownloadFile: ruta local en el PC del usuario (absoluta o relativa a local_working_dir).
    pub dest: String,
    /// Si true, transfiere `src` como directorio de forma recursiva. Por defecto false.
    #[serde(default)]
    pub recursive: bool,
    /// Patrones a excluir (solo aplica si `recursive` es true). Soporta `*` y
    /// `?` como comodines simples (ej. "node_modules", ".git", "*.log").
    /// Se compara contra el nombre de cada entrada (archivo o directorio),
    /// no contra la ruta completa.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub exclude: Option<Vec<String>>,
    /// Permisos octales a aplicar tras la transferencia (ej. "755", "644").
    /// Solo tiene efecto en el lado remoto (chmod vía SFTP); en descargas se
    /// ignora para el archivo local (no hay chmod portable Windows/Unix).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chmod: Option<String>,
}

/// Configuración de transferencia de archivo (Upload o Download).
/// Las rutas soportan interpolación de variables {{variable}}.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct FileTransferConfig {
    pub paths: Vec<PathMapping>,
    /// Si false, se omite la transferencia de un archivo si el destino ya
    /// existe (no aplica a directorios recursivos, donde siempre se
    /// sobrescribe archivo a archivo). Por defecto true.
    #[serde(default = "default_true")]
    pub overwrite: bool,
}

fn default_true() -> bool {
    true
}

/// Configuración serializada en project_tasks.config.
/// Usa un tag "type" para identificar el variante al deserializar.
/// Command y Script no necesitan config adicional (usan tasks.command directamente).
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "snake_case")]
#[ts(export, export_to = "tauri-types.d.ts")]
pub enum TaskConfig {
    UploadFile(FileTransferConfig),
    DownloadFile(FileTransferConfig),
}

impl TaskConfig {
    /// Deserializa un TaskConfig desde un string JSON.
    pub fn from_json(json: &str) -> Result<Self, String> {
        serde_json::from_str(json).map_err(|e| format!("Error al deserializar TaskConfig: {}", e))
    }

    /// Serializa el TaskConfig a string JSON.
    #[allow(dead_code)]
    pub fn to_json(&self) -> Result<String, String> {
        serde_json::to_string(self).map_err(|e| format!("Error al serializar TaskConfig: {}", e))
    }
}

// ============================================================================
// OnFailure
// ============================================================================

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS, sqlx::Type)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "TEXT")]
#[sqlx(rename_all = "snake_case")]
pub enum OnFailure {
    #[default]
    Stop,
    Continue,
    Retry,
}

// ============================================================================
// ProjectTask
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("project_tasks")]
pub struct ProjectTask {
    pub id: i64,
    pub project_id: i64,
    pub task_id: i64,
    pub order_execution: i64,
    pub enabled: bool,
    pub condition: Option<String>,
    pub on_failure: OnFailure,
    /// JSON serializado de TaskConfig. Solo requerido para UploadFile / DownloadFile.
    pub config: Option<String>,
    /// Sobreescribe local_working_dir del proyecto para esta task concreta.
    pub local_working_dir: Option<String>,
    /// Sobreescribe remote_working_dir del proyecto para esta task concreta.
    pub remote_working_dir: Option<String>,
    /// Sobreescribe retry_count de la task base. Si es None, hereda tasks.retry_count.
    pub retry_count: Option<i64>,
    /// Sobreescribe retry_delay de la task base. Si es None, hereda tasks.retry_delay.
    pub retry_delay: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

// ============================================================================
// CreateProjectTaskInput
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreateProjectTaskInput {
    pub project_id: i64,
    pub task_id: i64,
    pub order_execution: i64,
    pub enabled: Option<bool>,
    pub condition: Option<String>,
    pub on_failure: Option<OnFailure>,
    pub config: Option<String>,
    pub local_working_dir: Option<String>,
    pub remote_working_dir: Option<String>,
    pub retry_count: Option<i64>,
    pub retry_delay: Option<i64>,
}

impl CreateProjectTaskInput {
    pub fn into_project_task(self) -> ProjectTask {
        ProjectTask {
            id: 0,
            project_id: self.project_id,
            task_id: self.task_id,
            order_execution: self.order_execution,
            enabled: self.enabled.unwrap_or(true),
            condition: self.condition,
            on_failure: self.on_failure.unwrap_or_default(),
            config: self.config,
            local_working_dir: self.local_working_dir,
            remote_working_dir: self.remote_working_dir,
            retry_count: self.retry_count,
            retry_delay: self.retry_delay,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

// ============================================================================
// UpdateProjectTaskInput
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateProjectTaskInput {
    #[ts(optional)]
    pub order_execution: Option<i64>,
    #[ts(optional)]
    pub enabled: Option<bool>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub condition: Patch<String>,
    #[ts(optional)]
    pub on_failure: Option<OnFailure>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub config: Patch<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub local_working_dir: Patch<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub remote_working_dir: Patch<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub retry_count: Patch<i64>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub retry_delay: Patch<i64>,
}
