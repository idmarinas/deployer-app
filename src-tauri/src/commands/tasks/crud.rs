use serde_json::Value;

use crate::commands::tasks::types::{CreateTaskInput, Task, UpdateTaskInput};
use crate::crud_commands;

/// Construye los fields para una actualización parcial de Task.
/// Llamado internamente por `crud_update_task` (generado por `crud_commands!`).
fn build_task_update(input: &UpdateTaskInput, fields: &mut Vec<(String, Value)>) {
    if let Some(ref name) = input.name {
        fields.push(("name".to_string(), Value::String(name.clone())));
    }
    if let Some(ref task_type) = input.task_type {
        fields.push((
            "type".to_string(),
            serde_json::to_value(task_type).unwrap_or(Value::Null),
        ));
    }
    if let Some(timeout) = input.timeout {
        fields.push(("timeout".to_string(), Value::from(timeout)));
    }
    if let Some(retry_count) = input.retry_count {
        fields.push(("retry_count".to_string(), Value::from(retry_count)));
    }
    if let Some(retry_delay) = input.retry_delay {
        fields.push(("retry_delay".to_string(), Value::from(retry_delay)));
    }
    if let Some(enabled) = input.enabled {
        fields.push(("enabled".to_string(), Value::Bool(enabled)));
    }
    if let Some(is_global) = input.is_global {
        fields.push(("is_global".to_string(), Value::Bool(is_global)));
    }
    if let Some(v) = input.description.to_field_value() {
        fields.push(("description".to_string(), v));
    }
    if let Some(v) = input.command.to_field_value() {
        fields.push(("command".to_string(), v));
    }
}

crud_commands! {
    pub struct TaskCrud {
        entity: Task,
        fun: task,
        list_fun: tasks,
        i18n: "tauri.tasks",
        create: CreateTaskInput => into_task,
        update: UpdateTaskInput => build_task_update,
    }
}
