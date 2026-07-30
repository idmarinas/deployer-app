use serde_json::Value;

use crate::commands::deployments::rollbacks::types::{
    CreateDeploymentRollbackInput, DeploymentRollback, UpdateDeploymentRollbackInput,
};
use crate::crud_commands;

fn build_deployment_rollback_update(input: &UpdateDeploymentRollbackInput, fields: &mut Vec<(String, Value)>) {
    if let Some(ref status) = input.status {
        fields.push((
            "status".to_string(),
            serde_json::to_value(status).unwrap_or(Value::Null),
        ));
    }
    if let Some(v) = input.started_at.to_field_value() {
        fields.push(("started_at".to_string(), v));
    }
    if let Some(v) = input.finished_at.to_field_value() {
        fields.push(("finished_at".to_string(), v));
    }
}

crud_commands! {
    pub struct DeploymentRollbackCrud {
        entity: DeploymentRollback,
        fun: deployment_rollback,
        list_fun: deployment_rollbacks,
        i18n: "tauri.deployment_rollbacks",
        create: CreateDeploymentRollbackInput => into_deployment_rollback,
        update: UpdateDeploymentRollbackInput => build_deployment_rollback_update,
        list_filter: deployment_id: i64,
    }
}
