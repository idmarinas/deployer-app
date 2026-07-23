use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::commands::Patch;

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS, sqlx::Type)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "TEXT", rename_all = "snake_case")]
pub enum TaskType {
    #[default]
    Command,
    UploadFile,
    DownloadFile,
    Script,
}

impl std::fmt::Display for TaskType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TaskType::Command => write!(f, "command"),
            TaskType::UploadFile => write!(f, "upload_file"),
            TaskType::DownloadFile => write!(f, "download_file"),
            TaskType::Script => write!(f, "script"),
        }
    }
}

impl std::str::FromStr for TaskType {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "command" => Ok(TaskType::Command),
            "upload_file" => Ok(TaskType::UploadFile),
            "download_file" => Ok(TaskType::DownloadFile),
            "script" => Ok(TaskType::Script),
            other => Err(format!("TaskType no válido: '{}'", other)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("tasks")]
pub struct Task {
    pub id: i64,
    pub name: String,
    #[ts(type = "any")]
    pub description: Option<sqlx::types::Json<serde_json::Value>>,
    #[serde(rename = "type")]
    #[db_rename("type")]
    pub task_type: TaskType,
    /// Comando a ejecutar (o contenido del script si task_type = Script).
    /// Para UploadFile / DownloadFile este campo no se usa; la configuración
    /// específica va en project_tasks.config (TaskConfig).
    pub command: Option<String>,
    pub timeout: i64,
    pub retry_count: i64,
    /// Segundos de espera entre reintentos. Puede sobreescribirse en project_tasks.
    pub retry_delay: i64,
    pub enabled: bool,
    pub is_global: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreateTaskInput {
    pub name: String,
    pub description: Option<String>,
    pub task_type: TaskType,
    pub command: Option<String>,
    pub timeout: Option<i64>,
    pub retry_count: Option<i64>,
    pub retry_delay: Option<i64>,
    pub enabled: Option<bool>,
    pub is_global: Option<bool>,
}

impl CreateTaskInput {
    pub fn into_task(self) -> Task {
        Task {
            id: 0,
            name: self.name,
            description: self.description.and_then(|s| serde_json::from_str(&s).ok()).map(sqlx::types::Json),
            task_type: self.task_type,
            command: self.command,
            timeout: self.timeout.unwrap_or(300),
            retry_count: self.retry_count.unwrap_or(0),
            retry_delay: self.retry_delay.unwrap_or(5),
            enabled: self.enabled.unwrap_or(true),
            is_global: self.is_global.unwrap_or(false),
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateTaskInput {
    #[ts(optional)]
    pub name: Option<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub description: Patch<String>,
    #[ts(optional)]
    pub task_type: Option<TaskType>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub command: Patch<String>,
    #[ts(optional)]
    pub timeout: Option<i64>,
    #[ts(optional)]
    pub retry_count: Option<i64>,
    #[ts(optional)]
    pub retry_delay: Option<i64>,
    #[ts(optional)]
    pub enabled: Option<bool>,
    #[ts(optional)]
    pub is_global: Option<bool>,
}
