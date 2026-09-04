use serde::{Deserialize, Serialize};
use ts_rs::TS;

// ============================================================================
// Entidad DockerCompose
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct DockerCompose {
    pub id: i64,
    pub name: String,
    #[ts(type = "any")]
    pub description: Option<sqlx::types::Json<serde_json::Value>>,
    pub host_id: Option<i64>,
    pub remote_path: String,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
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
