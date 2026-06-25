use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::commands::Patch;

// ============================================================================
// Enum DeploymentStatus — compartido con deployment_rollbacks
// ============================================================================

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS, sqlx::Type)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "TEXT", rename_all = "snake_case")]
pub enum DeploymentStatus {
    #[default]
    Pending,
    Running,
    Success,
    Failed,
}

impl std::fmt::Display for DeploymentStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DeploymentStatus::Pending => write!(f, "pending"),
            DeploymentStatus::Running => write!(f, "running"),
            DeploymentStatus::Success => write!(f, "success"),
            DeploymentStatus::Failed => write!(f, "failed"),
        }
    }
}

impl std::str::FromStr for DeploymentStatus {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pending" => Ok(DeploymentStatus::Pending),
            "running" => Ok(DeploymentStatus::Running),
            "success" => Ok(DeploymentStatus::Success),
            "failed" => Ok(DeploymentStatus::Failed),
            other => Err(format!("DeploymentStatus no válido: '{}'", other)),
        }
    }
}

// ============================================================================
// Entidad Deployment
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("deployments")]
pub struct Deployment {
    pub id: i64,
    pub project_id: i64,
    pub version: String,
    pub tag: String,
    pub build: i64,
    pub status: DeploymentStatus,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
    pub duration_seconds: Option<i64>,
    pub triggered_by: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

// ============================================================================
// Input para crear un Deployment
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreateDeploymentInput {
    pub project_id: i64,
    pub version: String,
    pub tag: String,
    pub build: i64,
    pub triggered_by: Option<String>,
    pub notes: Option<String>,
}

impl CreateDeploymentInput {
    pub fn into_deployment(self) -> Deployment {
        Deployment {
            id: 0,
            project_id: self.project_id,
            version: self.version,
            tag: self.tag,
            build: self.build,
            status: DeploymentStatus::Pending,
            started_at: None,
            finished_at: None,
            duration_seconds: None,
            triggered_by: self.triggered_by,
            notes: self.notes,
            created_at: String::new(),
        }
    }
}

// ============================================================================
// Input para actualizar un Deployment
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateDeploymentInput {
    #[ts(optional)]
    pub status: Option<DeploymentStatus>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub started_at: Patch<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub finished_at: Patch<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub duration_seconds: Patch<i64>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub notes: Patch<String>,
}
