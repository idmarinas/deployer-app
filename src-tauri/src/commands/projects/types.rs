use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("projects")]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub git_url: Option<String>,
    pub framework: String,
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
    pub enabled: Option<bool>,
}

impl CreateProjectInput {
    pub fn into_project(self) -> Project {
        Project {
            id: 0,
            name: self.name,
            description: self.description,
            git_url: self.git_url,
            framework: self.framework,
            enabled: self.enabled.unwrap_or(true),
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateProjectInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub git_url: Option<String>,
    pub framework: Option<String>,
    pub enabled: Option<bool>,
}
