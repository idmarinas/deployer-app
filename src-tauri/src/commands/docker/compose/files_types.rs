use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("deployer_docker_compose_files")]
pub struct DockerComposeFile {
    pub id: i64,
    pub module_id: i64,
    pub file_path: String,
    pub content: Option<String>,
    pub is_binary: bool,
    pub name: String,
    pub mime_type: Option<String>,
    pub size: Option<i64>,
    pub last_modified: Option<i64>,
    pub webkit_relative_path: Option<String>,
    pub icon: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct ComposeFileInput {
    #[ts(optional)]
    pub id: Option<i64>,
    pub file_path: String,
    #[ts(optional = nullable)]
    pub content: Option<String>,
    pub is_binary: bool,
    pub name: String,
    #[ts(optional = nullable)]
    pub mime_type: Option<String>,
    #[ts(optional = nullable)]
    pub size: Option<i64>,
    #[ts(optional = nullable)]
    pub last_modified: Option<i64>,
    #[ts(optional = nullable)]
    pub webkit_relative_path: Option<String>,
    #[ts(optional = nullable)]
    pub icon: Option<String>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct SyncDockerComposeFilesInput {
    pub module_id: i64,
    pub files: Vec<ComposeFileInput>,
}
