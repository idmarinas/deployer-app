use serde_json::Value;

use crate::commands::Patch;
use crate::commands::projects::framework_configs::types::{
    CreateFrameworkConfigInput, FrameworkConfig, UpdateFrameworkConfigInput,
};
use crate::crud_commands;

fn build_framework_config_update(input: &UpdateFrameworkConfigInput, fields: &mut Vec<(String, Value)>) {
    if let Some(ref data_type) = input.data_type {
        fields.push((
            "data_type".to_string(),
            serde_json::to_value(data_type).unwrap_or(Value::Null),
        ));
    }
    if let Some(v) = input.description.to_field_value() {
        fields.push(("description".to_string(), v));
    }
}

crud_commands! {
    pub struct FrameworkConfigCrud {
        entity: FrameworkConfig,
        fun: framework_config,
        list_fun: framework_configs,
        i18n: "framework_configs",
        create: CreateFrameworkConfigInput => into_framework_config,
        update: UpdateFrameworkConfigInput => build_framework_config_update,
        conditional_encrypt: value => is_secret,
        list_filter: project_id: i64,
    }
}
