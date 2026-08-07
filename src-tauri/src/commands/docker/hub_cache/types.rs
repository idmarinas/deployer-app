use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, sqlx::FromRow)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct DockerHubSearchCache {
    pub id: i64,
    pub query: String,
    pub namespace: String,
    pub repository: String,
    pub description: Option<String>,
    pub pull_count: i64,
    pub star_count: i64,
    pub fetched_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, sqlx::FromRow)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct DockerHubTagsCache {
    pub id: i64,
    pub namespace: String,
    pub repository: String,
    pub url_query: String,
    pub url_next: Option<String>,
    pub url_previous: Option<String>,
    pub count: i64,
    pub tags: String,
    pub tags_versions: String,
    pub tags_variants: String,
    pub fetched_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct DockerHubImageResult {
    pub name: String,
    pub description: String,
    pub pull_count: i64,
    pub star_count: i64,
    pub official: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct DockerHubTagResult {
    pub name: String,
    pub full_size: i64,
    pub last_updated: String,
    pub version: String,
    pub variant: String,
}
