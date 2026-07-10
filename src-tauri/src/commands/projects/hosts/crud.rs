use serde_json::Value;

use crate::commands::Patch;
use crate::commands::projects::hosts::types::{
    CreateProjectHostInput, ProjectHost, UpdateProjectHostInput,
};
use crate::crud_commands;

fn build_project_host_update(input: &UpdateProjectHostInput, fields: &mut Vec<(String, Value)>) {
    if let Some(enabled) = input.enabled {
        fields.push(("enabled".to_string(), Value::Bool(enabled)));
    }
    if let Some(v) = input.deploy_order.to_field_value() {
        fields.push(("deploy_order".to_string(), v));
    }
}

crud_commands! {
    pub struct ProjectHostCrud {
        entity: ProjectHost,
        fun: project_host,
        list_fun: project_hosts,
        i18n: "project_hosts",
        create: CreateProjectHostInput => into_project_host,
        update: UpdateProjectHostInput => build_project_host_update,
        list_filter: project_id: i64,
    }
}
