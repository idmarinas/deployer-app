use serde_json::Value;

use crate::commands::global_variables::types::{
    CreateGlobalVariableInput, GlobalVariable, UpdateGlobalVariableInput,
};
use crate::crud_commands;

fn build_global_variable_update(input: &UpdateGlobalVariableInput, fields: &mut Vec<(String, Value)>) {
    if let Some(ref name) = input.name {
        fields.push(("name".to_string(), Value::String(name.clone())));
    }
    if let Some(v) = input.description.to_field_value() {
        fields.push(("description".to_string(), v));
    }
}

crud_commands! {
    pub struct GlobalVariableCrud {
        entity: GlobalVariable,
        fun: global_variable,
        list_fun: global_variables,
        i18n: "global_variables",
        create: CreateGlobalVariableInput => into_global_variable,
        update: UpdateGlobalVariableInput => build_global_variable_update,
        conditional_encrypt: value => is_secret,
    }
}
