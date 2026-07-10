use serde_json::Value;

use crate::commands::Patch;
use crate::commands::projects::tasks::types::{
    CreateProjectTaskInput, ProjectTask, UpdateProjectTaskInput,
};
use crate::crud_commands;

fn build_project_task_update(input: &UpdateProjectTaskInput, fields: &mut Vec<(String, Value)>) {
    if let Some(order_execution) = input.order_execution {
        fields.push(("order_execution".to_string(), Value::from(order_execution)));
    }
    if let Some(enabled) = input.enabled {
        fields.push(("enabled".to_string(), Value::Bool(enabled)));
    }
    if let Some(ref on_failure) = input.on_failure {
        fields.push((
            "on_failure".to_string(),
            serde_json::to_value(on_failure).unwrap_or(Value::Null),
        ));
    }
    if let Some(v) = input.condition.to_field_value() {
        fields.push(("condition".to_string(), v));
    }
    if let Some(v) = input.config.to_field_value() {
        fields.push(("config".to_string(), v));
    }
    if let Some(v) = input.local_working_dir.to_field_value() {
        fields.push(("local_working_dir".to_string(), v));
    }
    if let Some(v) = input.remote_working_dir.to_field_value() {
        fields.push(("remote_working_dir".to_string(), v));
    }
    if let Some(v) = input.retry_count.to_field_value() {
        fields.push(("retry_count".to_string(), v));
    }
    if let Some(v) = input.retry_delay.to_field_value() {
        fields.push(("retry_delay".to_string(), v));
    }
}

crud_commands! {
    pub struct ProjectTaskCrud {
        entity: ProjectTask,
        fun: project_task,
        list_fun: project_tasks,
        i18n: "project_tasks",
        create: CreateProjectTaskInput => into_project_task,
        update: UpdateProjectTaskInput => build_project_task_update,
        list_filter: project_id: i64,
    }
}
