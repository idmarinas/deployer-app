use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::patch::Patch;

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("deployer_docker_compose_files")]
pub struct DockerComposeFile {
    pub id: i64,
    pub docker_compose_id: i64,
    pub file_path: String,
    pub content: Option<String>,
    pub is_binary: bool,
    pub metadata: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreateDockerComposeFileInput {
    pub docker_compose_id: i64,
    pub file_path: String,
    pub content: Option<String>,
    pub is_binary: Option<bool>,
    pub metadata: Option<String>,
}

impl CreateDockerComposeFileInput {
    pub fn into_docker_compose_file(self) -> DockerComposeFile {
        DockerComposeFile {
            id: 0,
            docker_compose_id: self.docker_compose_id,
            file_path: self.file_path,
            content: self.content,
            is_binary: self.is_binary.unwrap_or(false),
            metadata: self.metadata,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateDockerComposeFileInput {
    pub id: i64,
    #[ts(optional)]
    pub file_path: Option<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub content: Patch<Option<String>>,
    #[ts(optional)]
    pub is_binary: Option<bool>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub metadata: Patch<Option<String>>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct DeleteDockerComposeFileInput {
    pub id: i64,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UploadComposeFilesInput {
    pub docker_compose_id: i64,
    pub file_paths: Vec<String>,
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
    #[ts(optional = nullable)]
    pub metadata: Option<String>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct SyncDockerComposeFilesInput {
    pub docker_compose_id: i64,
    pub files: Vec<ComposeFileInput>,
}