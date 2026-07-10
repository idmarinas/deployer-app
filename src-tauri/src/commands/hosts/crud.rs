use serde_json::Value;

use crate::commands::hosts::types::{CreateHostInput, Host, UpdateHostInput};
use crate::commands::Patch;
use crate::crud_commands;

fn build_host_update(input: &UpdateHostInput, fields: &mut Vec<(String, Value)>) {
    if let Some(ref name) = input.name {
        fields.push(("name".to_string(), Value::String(name.clone())));
    }
    if let Some(ref host) = input.host {
        fields.push(("host".to_string(), Value::String(host.clone())));
    }
    if let Some(port) = input.port {
        fields.push(("port".to_string(), Value::from(port)));
    }
    if let Some(ref username) = input.username {
        fields.push(("username".to_string(), Value::String(username.clone())));
    }
    if let Some(ref auth_type) = input.auth_type {
        fields.push((
            "auth_type".to_string(),
            serde_json::to_value(auth_type).unwrap_or(Value::Null),
        ));
    }
    if let Some(v) = input.password.to_field_value() {
        fields.push(("password".to_string(), v));
    }
    if let Some(v) = input.key_id.to_field_value() {
        fields.push(("key_id".to_string(), v));
    }
    if let Some(v) = input.description.to_field_value() {
        fields.push(("description".to_string(), v));
    }
    if let Some(enabled) = input.enabled {
        fields.push(("enabled".to_string(), Value::Bool(enabled)));
    }
}

crud_commands! {
    pub struct HostCrud {
        entity: Host,
        fun: host,
        list_fun: hosts,
        i18n: "hosts",
        create: CreateHostInput => into_host,
        update: UpdateHostInput => build_host_update,
    }
}
