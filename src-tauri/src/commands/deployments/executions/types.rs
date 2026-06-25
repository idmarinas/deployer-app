use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::commands::Patch;

#[allow(unused_imports)]
pub use crate::commands::deployments::types::DeploymentStatus;

// ============================================================================
// Enum ExecutionStatus — añade 'skipped' sobre DeploymentStatus
// ============================================================================

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS, sqlx::Type)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "TEXT", rename_all = "snake_case")]
pub enum ExecutionStatus {
    #[default]
    Pending,
    Running,
    Success,
    Failed,
    Skipped,
}

impl std::fmt::Display for ExecutionStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExecutionStatus::Pending => write!(f, "pending"),
            ExecutionStatus::Running => write!(f, "running"),
            ExecutionStatus::Success => write!(f, "success"),
            ExecutionStatus::Failed => write!(f, "failed"),
            ExecutionStatus::Skipped => write!(f, "skipped"),
        }
    }
}

impl std::str::FromStr for ExecutionStatus {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pending" => Ok(ExecutionStatus::Pending),
            "running" => Ok(ExecutionStatus::Running),
            "success" => Ok(ExecutionStatus::Success),
            "failed" => Ok(ExecutionStatus::Failed),
            "skipped" => Ok(ExecutionStatus::Skipped),
            other => Err(format!("ExecutionStatus no válido: '{}'", other)),
        }
    }
}

// ============================================================================
// Entidad DeploymentExecution
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("deployment_executions")]
pub struct DeploymentExecution {
    pub id: i64,
    pub deployment_id: i64,
    pub host_id: i64,
    pub task_id: i64,
    pub status: ExecutionStatus,
    pub exit_code: Option<i64>,
    pub output: Option<String>,
    pub error_message: Option<String>,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
    pub duration_seconds: Option<i64>,
    pub retry_attempt: i64,
    pub created_at: String,
}

// ============================================================================
// Input para crear un DeploymentExecution
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreateDeploymentExecutionInput {
    pub deployment_id: i64,
    pub host_id: i64,
    pub task_id: i64,
    pub retry_attempt: Option<i64>,
}

impl CreateDeploymentExecutionInput {
    pub fn into_deployment_execution(self) -> DeploymentExecution {
        DeploymentExecution {
            id: 0,
            deployment_id: self.deployment_id,
            host_id: self.host_id,
            task_id: self.task_id,
            status: ExecutionStatus::Pending,
            exit_code: None,
            output: None,
            error_message: None,
            started_at: None,
            finished_at: None,
            duration_seconds: None,
            retry_attempt: self.retry_attempt.unwrap_or(0),
            created_at: String::new(),
        }
    }
}

// ============================================================================
// Input para actualizar un DeploymentExecution
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateDeploymentExecutionInput {
    #[ts(optional)]
    pub status: Option<ExecutionStatus>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub exit_code: Patch<i64>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub output: Patch<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub error_message: Patch<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub started_at: Patch<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub finished_at: Patch<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub duration_seconds: Patch<i64>,
    #[ts(optional)]
    pub retry_attempt: Option<i64>,
}
