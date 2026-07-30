use serde_json::Value;

use crate::commands::tasks::dependencies::types::{
    CreateTaskDependencyInput, TaskDependency, UpdateTaskDependencyInput,
};
use crate::crud_commands;

fn build_task_dependency_update(input: &UpdateTaskDependencyInput, fields: &mut Vec<(String, Value)>) {
    fields.push((
        "dependency_type".to_string(),
        serde_json::to_value(&input.dependency_type).unwrap_or(Value::Null),
    ));
}

crud_commands! {
    pub struct TaskDependencyCrud {
        entity: TaskDependency,
        fun: task_dependency,
        list_fun: task_dependencies,
        i18n: "tauri.task_dependencies",
        create: CreateTaskDependencyInput => into_task_dependency,
        update: UpdateTaskDependencyInput => build_task_dependency_update,
        list_filter: task_id: i64,
    }
}
