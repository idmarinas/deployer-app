use serde::Serialize;
use std::collections::HashMap;
use ts_rs::TS;

#[derive(Serialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CommandResponse<T = ()> {
    pub success: bool,
    pub data: Option<T>,
    pub message_key: String,
    pub message_params: HashMap<String, String>,
}

impl<T> CommandResponse<T> {
    pub fn ok(data: T, key: &str) -> Self {
        Self {
            success: true,
            data: Some(data),
            message_key: key.to_string(),
            message_params: HashMap::new(),
        }
    }

    pub fn err(key: &str, params: HashMap<String, String>) -> Self {
        Self {
            success: false,
            data: None,
            message_key: key.to_string(),
            message_params: params,
        }
    }
}

impl CommandResponse<()> {
    pub fn ok_empty(key: &str) -> Self {
        Self {
            success: true,
            data: Some(()),
            message_key: key.to_string(),
            message_params: HashMap::new(),
        }
    }
}
