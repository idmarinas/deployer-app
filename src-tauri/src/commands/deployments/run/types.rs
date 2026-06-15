use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::commands::deployments::executions::types::ExecutionStatus;
use crate::commands::deployments::types::DeploymentStatus;

// ============================================================================
// Input del comando run_deployment
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct RunDeploymentInput {
    pub deployment_id: i64,
    /// Número máximo de intentos de reconexión SSH si la sesión cae. Por defecto: 3.
    pub ssh_reconnect_attempts: Option<u32>,
}

// ============================================================================
// Eventos de progreso enviados por el Channel al frontend
// ============================================================================

#[derive(Debug, Clone, Serialize, TS)]
#[serde(tag = "event", rename_all = "snake_case")]
#[ts(export, export_to = "tauri-types.d.ts")]
pub enum ProgressEvent {
    /// El deployment ha comenzado.
    DeploymentStarted {
        deployment_id: i64,
        total_tasks: u32,
    },
    /// Una task está en cola (pending), antes de ejecutarse.
    TaskPending {
        execution_id: i64,
        task_name: String,
        order: u32,
    },
    /// Una task ha comenzado a ejecutarse.
    TaskStarted {
        execution_id: i64,
        task_name: String,
    },
    /// Chunk de output acumulado de un comando en ejecución.
    /// Se emite cada ~100ms con el output acumulado desde el último chunk.
    OutputChunk {
        execution_id: i64,
        chunk: String,
    },
    /// Una task va a reintentarse tras un fallo.
    TaskRetrying {
        execution_id: i64,
        attempt: u32,
        max_attempts: u32,
        delay_secs: u32,
    },
    /// Una task ha finalizado (con cualquier estado).
    TaskFinished {
        execution_id: i64,
        task_name: String,
        status: ExecutionStatus,
        exit_code: Option<i64>,
        duration_seconds: i64,
    },
    /// Una task ha sido saltada (condición no cumplida o skipped por on_failure anterior).
    TaskSkipped {
        execution_id: i64,
        task_name: String,
        reason: String,
    },
    /// El deployment ha finalizado.
    DeploymentFinished {
        deployment_id: i64,
        status: DeploymentStatus,
        duration_seconds: i64,
    },
    /// Error fatal que ha interrumpido el deployment.
    #[allow(dead_code)]
    FatalError {
        message: String,
    },
}

// ============================================================================
// Datos internos del runner (no se serializan al frontend)
// ============================================================================

/// Snapshot inmutable de variables resueltas para el deployment.
/// Precedencia: variables de proyecto > variables globales > variables de sistema.
#[derive(Debug, Clone)]
pub struct VariableSnapshot {
    pub vars: std::collections::HashMap<String, String>,
}

impl VariableSnapshot {
    pub fn new(vars: std::collections::HashMap<String, String>) -> Self {
        Self { vars }
    }

    /// Resuelve todas las variables en un string usando la sintaxis {{variable}}.
    pub fn interpolate(&self, input: &str) -> String {
        let mut result = input.to_string();
        for (key, value) in &self.vars {
            let placeholder = format!("{{{{{}}}}}", key);
            result = result.replace(&placeholder, value);
        }
        result
    }
}

/// Datos resueltos de una task para su ejecución, combinando task base + project_task + proyecto.
#[derive(Debug, Clone)]
pub struct ResolvedTask {
    pub project_task_id: i64,
    #[allow(dead_code)]
    pub task_id: i64,
    pub task_name: String,
    pub task_type: crate::commands::tasks::types::TaskType,
    /// Comando interpolado (Command/Script).
    pub command: Option<String>,
    /// Config deserializada (UploadFile/DownloadFile).
    pub config: Option<crate::commands::projects::tasks::types::TaskConfig>,
    /// Working dir local resuelto (project_task > project).
    pub local_working_dir: Option<String>,
    /// Working dir remoto resuelto (project_task > project).
    pub remote_working_dir: Option<String>,
    pub timeout: i64,
    pub retry_count: u32,
    pub retry_delay: u32,
    pub on_failure: crate::commands::projects::tasks::types::OnFailure,
    pub condition: Option<String>,
}
