use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::patch::Patch;

pub use crate::commands::deployments::types::DeploymentStatus;

// ============================================================================
// Entidad DeploymentRollback
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("deployment_rollbacks")]
pub struct DeploymentRollback {
    pub id: i64,
    pub deployment_id: i64,
    pub rolled_back_to_deployment_id: i64,
    pub status: DeploymentStatus,
    pub reason: Option<String>,
    pub triggered_by: Option<String>,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
    pub created_at: String,
}

// ============================================================================
// Input para crear un DeploymentRollback
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreateDeploymentRollbackInput {
    pub deployment_id: i64,
    pub rolled_back_to_deployment_id: i64,
    pub reason: Option<String>,
    pub triggered_by: Option<String>,
}

impl CreateDeploymentRollbackInput {
    pub fn into_deployment_rollback(self) -> DeploymentRollback {
        DeploymentRollback {
            id: 0,
            deployment_id: self.deployment_id,
            rolled_back_to_deployment_id: self.rolled_back_to_deployment_id,
            status: DeploymentStatus::Pending,
            reason: self.reason,
            triggered_by: self.triggered_by,
            started_at: None,
            finished_at: None,
            created_at: String::new(),
        }
    }
}

// ============================================================================
// Input para actualizar un DeploymentRollback
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateDeploymentRollbackInput {
    #[ts(optional)]
    pub status: Option<DeploymentStatus>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub started_at: Patch<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub finished_at: Patch<String>,
}
