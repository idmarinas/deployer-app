use serde_json::Value;

use crate::commands::deployments::executions::types::{
    CreateDeploymentExecutionInput, DeploymentExecution, UpdateDeploymentExecutionInput,
};
use crate::crud_commands;

fn build_deployment_execution_update(input: &UpdateDeploymentExecutionInput, fields: &mut Vec<(String, Value)>) {
    if let Some(ref status) = input.status {
        fields.push((
            "status".to_string(),
            serde_json::to_value(status).unwrap_or(Value::Null),
        ));
    }
    if let Some(retry_attempt) = input.retry_attempt {
        fields.push(("retry_attempt".to_string(), Value::from(retry_attempt)));
    }
    if let Some(v) = input.exit_code.to_field_value() {
        fields.push(("exit_code".to_string(), v));
    }
    if let Some(v) = input.output.to_field_value() {
        fields.push(("output".to_string(), v));
    }
    if let Some(v) = input.error_message.to_field_value() {
        fields.push(("error_message".to_string(), v));
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
}

crud_commands! {
    pub struct DeploymentExecutionCrud {
        entity: DeploymentExecution,
        fun: deployment_execution,
        list_fun: deployment_executions,
        i18n: "deployment_executions",
        create: CreateDeploymentExecutionInput => into_deployment_execution,
        update: UpdateDeploymentExecutionInput => build_deployment_execution_update,
        list_filter: deployment_id: i64,
    }
}
