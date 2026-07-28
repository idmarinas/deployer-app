use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::patch::Patch;

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("projects")]
pub struct Project {
    pub id: i64,
    pub name: String,
    #[ts(type = "any")]
    pub description: Option<sqlx::types::Json<serde_json::Value>>,
    pub git_url: Option<String>,
    pub framework: String,
    /// Ruta base local del proyecto en el PC del usuario.
    /// Actúa como working_dir por defecto para tareas locales (UploadFile, DownloadFile).
    pub local_working_dir: Option<String>,
    /// Ruta base del proyecto en el servidor remoto.
    /// Actúa como working_dir por defecto para tareas remotas (Command, Script).
    pub remote_working_dir: Option<String>,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreateProjectInput {
    pub name: String,
    pub description: Option<String>,
    pub git_url: Option<String>,
    pub framework: String,
    pub local_working_dir: Option<String>,
    pub remote_working_dir: Option<String>,
    pub enabled: Option<bool>,
}

impl CreateProjectInput {
    pub fn into_project(self) -> Project {
        Project {
            id: 0,
            name: self.name,
            description: self.description.and_then(|s| serde_json::from_str(&s).ok()).map(sqlx::types::Json),
            git_url: self.git_url,
            framework: self.framework,
            local_working_dir: self.local_working_dir,
            remote_working_dir: self.remote_working_dir,
            enabled: self.enabled.unwrap_or(true),
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateProjectInput {
    #[ts(optional)]
    pub name: Option<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub description: Patch<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub git_url: Patch<String>,
    #[ts(optional)]
    pub framework: Option<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub local_working_dir: Patch<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub remote_working_dir: Patch<String>,
    #[ts(optional)]
    pub enabled: Option<bool>,
}
