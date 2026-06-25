use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::commands::Patch;

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("global_variables")]
pub struct GlobalVariable {
    pub id: i64,
    pub name: String,
    #[db_conditional_encrypt(condition = "is_secret")]
    pub value: String,
    pub is_secret: bool,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreateGlobalVariableInput {
    pub name: String,
    pub value: String,
    pub is_secret: Option<bool>,
    pub description: Option<String>,
}

impl CreateGlobalVariableInput {
    pub fn into_global_variable(self) -> GlobalVariable {
        GlobalVariable {
            id: 0,
            name: self.name,
            value: self.value,
            is_secret: self.is_secret.unwrap_or(false),
            description: self.description,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateGlobalVariableInput {
    #[ts(optional)]
    pub name: Option<String>,
    #[ts(optional)]
    pub value: Option<String>,
    #[ts(optional)]
    pub is_secret: Option<bool>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub description: Patch<String>,
}
