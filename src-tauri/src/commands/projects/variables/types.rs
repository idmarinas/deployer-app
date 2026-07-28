use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::patch::Patch;

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("project_variables")]
pub struct ProjectVariable {
    pub id: i64,
    pub project_id: i64,
    pub name: String,
    pub slug: String,
    #[db_conditional_encrypt(condition = "is_secret")]
    pub value: String,
    pub is_secret: bool,
    pub data_type: String,
    #[ts(type = "any")]
    pub description: Option<sqlx::types::Json<serde_json::Value>>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreateProjectVariableInput {
    pub project_id: i64,
    pub name: String,
    pub slug: String,
    pub value: String,
    pub is_secret: Option<bool>,
    pub data_type: Option<String>,
    pub description: Option<String>,
}

impl CreateProjectVariableInput {
    pub fn into_project_variable(self) -> ProjectVariable {
        ProjectVariable {
            id: 0,
            project_id: self.project_id,
            name: self.name,
            slug: self.slug,
            value: self.value,
            is_secret: self.is_secret.unwrap_or(false),
            data_type: self.data_type.unwrap_or_else(|| "string".to_string()),
            description: self.description.and_then(|s| serde_json::from_str(&s).ok()).map(sqlx::types::Json),
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateProjectVariableInput {
    #[ts(optional)]
    pub name: Option<String>,
    #[ts(optional)]
    pub slug: Option<String>,
    #[ts(optional)]
    pub value: Option<String>,
    #[ts(optional)]
    pub is_secret: Option<bool>,
    #[ts(optional)]
    pub data_type: Option<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub description: Patch<String>,
}
