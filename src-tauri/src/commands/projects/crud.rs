use serde_json::Value;

use crate::commands::projects::types::{CreateProjectInput, Project, UpdateProjectInput};
use crate::crud_commands;

fn build_project_update(input: &UpdateProjectInput, fields: &mut Vec<(String, Value)>) {
    if let Some(ref name) = input.name {
        fields.push(("name".to_string(), Value::String(name.clone())));
    }
    if let Some(ref framework) = input.framework {
        fields.push(("framework".to_string(), Value::String(framework.clone())));
    }
    if let Some(enabled) = input.enabled {
        fields.push(("enabled".to_string(), Value::Bool(enabled)));
    }
    if let Some(v) = input.description.to_field_value() {
        fields.push(("description".to_string(), v));
    }
    if let Some(v) = input.git_url.to_field_value() {
        fields.push(("git_url".to_string(), v));
    }
    if let Some(v) = input.local_working_dir.to_field_value() {
        fields.push(("local_working_dir".to_string(), v));
    }
    if let Some(v) = input.remote_working_dir.to_field_value() {
        fields.push(("remote_working_dir".to_string(), v));
    }
}

crud_commands! {
    pub struct ProjectCrud {
        entity: Project,
        fun: project,
        list_fun: projects,
        i18n: "projects",
        create: CreateProjectInput => into_project,
        update: UpdateProjectInput => build_project_update,
    }
}
