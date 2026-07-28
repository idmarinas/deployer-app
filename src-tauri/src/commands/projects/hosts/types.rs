use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::patch::Patch;

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("project_hosts")]
pub struct ProjectHost {
    pub id: i64,
    pub project_id: i64,
    pub host_id: i64,
    pub deploy_order: Option<i64>,
    pub enabled: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreateProjectHostInput {
    pub project_id: i64,
    pub host_id: i64,
    pub deploy_order: Option<i64>,
    pub enabled: Option<bool>,
}

impl CreateProjectHostInput {
    pub fn into_project_host(self) -> ProjectHost {
        ProjectHost {
            id: 0,
            project_id: self.project_id,
            host_id: self.host_id,
            deploy_order: self.deploy_order,
            enabled: self.enabled.unwrap_or(true),
            created_at: String::new(),
        }
    }
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateProjectHostInput {
    #[serde(default)]
    #[ts(optional = nullable)]
    pub deploy_order: Patch<i64>,
    #[ts(optional)]
    pub enabled: Option<bool>,
}
