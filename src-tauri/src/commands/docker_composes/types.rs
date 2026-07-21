use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::commands::Patch;

// ============================================================================
// Entidad DockerCompose
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("docker_composes")]
pub struct DockerCompose {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub compose_content: String,
    pub host_id: Option<i64>,
    pub remote_path: String,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

// ============================================================================
// Input para crear un DockerCompose
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreateDockerComposeInput {
    pub name: String,
    pub description: Option<String>,
    pub compose_content: String,
    pub host_id: Option<i64>,
    pub remote_path: Option<String>,
    pub enabled: Option<bool>,
}

impl CreateDockerComposeInput {
    pub fn into_docker_compose(self) -> DockerCompose {
        DockerCompose {
            id: 0,
            name: self.name,
            description: self.description,
            compose_content: self.compose_content,
            host_id: self.host_id,
            remote_path: self
                .remote_path
                .unwrap_or_else(|| "/opt/docker-compose/docker-compose.yml".to_string()),
            enabled: self.enabled.unwrap_or(true),
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

// ============================================================================
// Input para actualizar un DockerCompose
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateDockerComposeInput {
    #[ts(optional)]
    pub name: Option<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub description: Patch<String>,
    #[ts(optional)]
    pub compose_content: Option<String>,
    #[ts(optional)]
    pub host_id: Option<i64>,
    #[ts(optional)]
    pub remote_path: Option<String>,
    #[ts(optional)]
    pub enabled: Option<bool>,
}

// ============================================================================
// Input para operaciones Docker Compose
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct DockerComposeOperationInput {
    pub docker_compose_id: i64,
}

// ============================================================================
// Output de docker compose ps --format json
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct DockerComposeService {
    pub name: String,
    pub status: String,
    pub health: Option<String>,
}
