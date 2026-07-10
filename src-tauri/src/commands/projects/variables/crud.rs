use serde_json::Value;

use crate::commands::projects::variables::types::{
    CreateProjectVariableInput, ProjectVariable, UpdateProjectVariableInput,
};
use crate::crud_commands;

fn build_project_variable_update(input: &UpdateProjectVariableInput, fields: &mut Vec<(String, Value)>) {
    if let Some(ref name) = input.name {
        fields.push(("name".to_string(), Value::String(name.clone())));
    }
    if let Some(v) = input.description.to_field_value() {
        fields.push(("description".to_string(), v));
    }
}

crud_commands! {
    pub struct ProjectVariableCrud {
        entity: ProjectVariable,
        fun: project_variable,
        list_fun: project_variables,
        i18n: "project_variables",
        create: CreateProjectVariableInput => into_project_variable,
        update: UpdateProjectVariableInput => build_project_variable_update,
        conditional_encrypt: value => is_secret,
        list_filter: project_id: i64,
    }
}
