use serde_json::Value;

use crate::commands::passkeys::types::{CreatePasskeyInput, Passkey, UpdatePasskeyInput};
use crate::commands::Patch;
use crate::crud_commands;

fn build_passkey_update(input: &UpdatePasskeyInput, fields: &mut Vec<(String, Value)>) {
    if let Some(ref name) = input.name {
        fields.push(("name".to_string(), Value::String(name.clone())));
    }
    if let Some(ref key_content) = input.key_content {
        fields.push(("key_content".to_string(), Value::String(key_content.clone())));
    }
    if let Some(v) = input.passphrase.to_field_value() {
        fields.push(("passphrase".to_string(), v));
    }
    if let Some(v) = input.key_type.to_field_value() {
        fields.push(("key_type".to_string(), v));
    }
    if let Some(v) = input.fingerprint.to_field_value() {
        fields.push(("fingerprint".to_string(), v));
    }
    if let Some(v) = input.description.to_field_value() {
        fields.push(("description".to_string(), v));
    }
}

crud_commands! {
    pub struct PasskeyCrud {
        entity: Passkey,
        fun: passkey,
        list_fun: passkeys,
        i18n: "passkeys",
        create: CreatePasskeyInput => into_passkey,
        update: UpdatePasskeyInput => build_passkey_update,
    }
}
