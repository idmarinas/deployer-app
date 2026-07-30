use serde_json::Value;

use crate::commands::deployments::types::{
    CreateDeploymentInput, Deployment, UpdateDeploymentInput,
};
use crate::crud_commands;

fn build_deployment_update(input: &UpdateDeploymentInput, fields: &mut Vec<(String, Value)>) {
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
    if let Some(v) = input.duration_seconds.to_field_value() {
        fields.push(("duration_seconds".to_string(), v));
    }
    if let Some(v) = input.notes.to_field_value() {
        fields.push(("notes".to_string(), v));
    }
}

crud_commands! {
    pub struct DeploymentCrud {
        entity: Deployment,
        fun: deployment,
        list_fun: deployments,
        i18n: "tauri.deployments",
        create: CreateDeploymentInput => into_deployment,
        update: UpdateDeploymentInput => build_deployment_update,
        list_filter: project_id: i64,
    }
}
