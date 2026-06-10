use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[serde(rename_all = "snake_case")]
pub enum Framework {
    Symfony,
    Laravel,
    Nextjs,
    #[default]
    Generic,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[serde(rename_all = "snake_case")]
pub enum DataType {
    #[default]
    String,
    Integer,
    Boolean,
    Json,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("framework_configs")]
pub struct FrameworkConfig {
    pub id: i64,
    pub project_id: i64,
    pub framework: Framework,
    pub key: String,
    #[db_conditional_encrypt(condition = "is_secret")]
    pub value: String,
    pub is_secret: bool,
    pub data_type: DataType,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreateFrameworkConfigInput {
    pub project_id: i64,
    pub framework: Framework,
    pub key: String,
    pub value: String,
    pub is_secret: Option<bool>,
    pub data_type: Option<DataType>,
    pub description: Option<String>,
}

impl CreateFrameworkConfigInput {
    pub fn into_framework_config(self) -> FrameworkConfig {
        FrameworkConfig {
            id: 0,
            project_id: self.project_id,
            framework: self.framework,
            key: self.key,
            value: self.value,
            is_secret: self.is_secret.unwrap_or(false),
            data_type: self.data_type.unwrap_or_default(),
            description: self.description,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateFrameworkConfigInput {
    pub value: Option<String>,
    pub is_secret: Option<bool>,
    pub data_type: Option<DataType>,
    pub description: Option<String>,
}
