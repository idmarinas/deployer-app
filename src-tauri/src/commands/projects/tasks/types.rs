use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS, sqlx::Type)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "TEXT")]
#[sqlx(rename_all = "snake_case")]
pub enum OnFailure {
    #[default]
    Stop,
    Continue,
    Retry,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("project_tasks")]
pub struct ProjectTask {
    pub id: i64,
    pub project_id: i64,
    pub task_id: i64,
    pub order_execution: i64,
    pub enabled: bool,
    pub condition: Option<String>,
    pub on_failure: OnFailure,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreateProjectTaskInput {
    pub project_id: i64,
    pub task_id: i64,
    pub order_execution: i64,
    pub enabled: Option<bool>,
    pub condition: Option<String>,
    pub on_failure: Option<OnFailure>,
}

impl CreateProjectTaskInput {
    pub fn into_project_task(self) -> ProjectTask {
        ProjectTask {
            id: 0,
            project_id: self.project_id,
            task_id: self.task_id,
            order_execution: self.order_execution,
            enabled: self.enabled.unwrap_or(true),
            condition: self.condition,
            on_failure: self.on_failure.unwrap_or_default(),
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateProjectTaskInput {
    pub order_execution: Option<i64>,
    pub enabled: Option<bool>,
    pub condition: Option<String>,
    pub on_failure: Option<OnFailure>,
}
