use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[serde(rename_all = "snake_case")]
pub enum DependencyType {
    #[default]
    Success,
    Failure,
    Always,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("task_dependencies")]
pub struct TaskDependency {
    pub id: i64,
    pub task_id: i64,
    pub depends_on_task_id: i64,
    pub dependency_type: DependencyType,
    pub created_at: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreateTaskDependencyInput {
    pub task_id: i64,
    pub depends_on_task_id: i64,
    pub dependency_type: Option<DependencyType>,
}

impl CreateTaskDependencyInput {
    pub fn into_task_dependency(self) -> TaskDependency {
        TaskDependency {
            id: 0,
            task_id: self.task_id,
            depends_on_task_id: self.depends_on_task_id,
            dependency_type: self.dependency_type.unwrap_or_default(),
            created_at: String::new(),
        }
    }
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateTaskDependencyInput {
    pub dependency_type: DependencyType,
}
