use serde_json::Value;

use crate::commands::docker::compose::types::{
    CreateDockerComposeInput, DockerCompose, UpdateDockerComposeInput,
};
use crate::crud_commands;

fn build_docker_compose_update(
    input: &UpdateDockerComposeInput,
    fields: &mut Vec<(String, Value)>,
) {
    if let Some(ref name) = input.name {
        fields.push(("name".to_string(), Value::String(name.clone())));
    }
    if let Some(v) = input.description.to_field_value() {
        fields.push(("description".to_string(), v));
    }
    if let Some(host_id) = input.host_id {
        fields.push(("host_id".to_string(), Value::from(host_id)));
    }
    if let Some(ref path) = input.remote_path {
        fields.push(("remote_path".to_string(), Value::String(path.clone())));
    }
    if let Some(enabled) = input.enabled {
        fields.push(("enabled".to_string(), Value::Bool(enabled)));
    }
}

crud_commands! {
    pub struct DockerComposeCrud {
        entity: DockerCompose,
        fun: docker_compose,
        list_fun: docker_composes,
        i18n: "tauri.docker_composes",
        create: CreateDockerComposeInput => into_docker_compose,
        update: UpdateDockerComposeInput => build_docker_compose_update,
    }
}
