use sqlx::SqlitePool;
use tauri::AppHandle;

use crate::helpers::open_pool;
use crate::tables;
use super::types::{DockerHubTagsCache, DockerHubTagResult};

const TAGS_CACHE_TTL_SECONDS: i64 = 86400;
const TAGS_PAGE_SIZE: u32 = 100;
const MAX_TAG_PAGES: usize = 100;

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn parse_image_name(image_name: &str) -> (String, String) {
    let parts: Vec<&str> = image_name.splitn(2, '/').collect();
    if parts.len() >= 2 {
        (parts[0].to_string(), parts[1].to_string())
    } else {
        ("library".to_string(), image_name.to_string())
    }
}

fn cache_is_fresh(fetched_at: &str, ttl_seconds: i64) -> bool {
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(fetched_at) {
        let elapsed = chrono::Utc::now().signed_duration_since(dt);
        elapsed.num_seconds() < ttl_seconds
    } else {
        false
    }
}

fn parse_tag(tag_name: &str) -> (String, String) {
    if let Some(idx) = tag_name.find('-') {
        if idx > 0 {
            return (tag_name[..idx].to_string(), tag_name[idx + 1..].to_string());
        }
    }
    (tag_name.to_string(), String::new())
}

fn sanitize_tag_object(mut obj: serde_json::Value) -> serde_json::Value {
    if let Some(o) = obj.as_object_mut() {
        for key in ["images", "digest", "content_type", "media_type"] {
            o.remove(key);
        }
        let full_size = o
            .get("full_size")
            .and_then(serde_json::Value::as_i64)
            .unwrap_or(0);
        o.insert("full_size".to_string(), serde_json::json!(full_size));
        let last_updated = o
            .get("last_updated")
            .and_then(serde_json::Value::as_str)
            .unwrap_or("")
            .to_string();
        o.insert("last_updated".to_string(), serde_json::json!(last_updated));
    }
    obj
}

fn parse_stored_tags(tags_json: &str) -> Vec<DockerHubTagResult> {
    serde_json::from_str::<Vec<DockerHubTagResult>>(tags_json).unwrap_or_default()
}

#[derive(serde::Deserialize)]
struct HubTagsResponse {
    count: i64,
    next: Option<String>,
    previous: Option<String>,
    results: Vec<serde_json::Value>,
}

struct TagsPage {
    tags: Vec<DockerHubTagResult>,
    next: Option<String>,
}

async fn get_or_fetch_tags_page(
    pool: &SqlitePool,
    namespace: &str,
    repository: &str,
    url: &str,
) -> Result<TagsPage, String> {
    let cached: Option<DockerHubTagsCache> = sqlx::query_as(&format!(
        "SELECT id, namespace, repository, url_query, url_next, url_previous, count, tags, tags_versions, tags_variants, fetched_at
         FROM {} WHERE url_query = ?1",
        tables::TABLE_CACHE_PROJECTS_DOCKER_TAGS
    ))
    .bind(url)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    if let Some(row) = &cached {
        if cache_is_fresh(&row.fetched_at, TAGS_CACHE_TTL_SECONDS) {
            return Ok(TagsPage {
                tags: parse_stored_tags(&row.tags),
                next: row.url_next.clone(),
            });
        }
    }

    let client = reqwest::Client::new();
    let resp = client
        .get(url)
        .header("User-Agent", "DeployerApp/1.0")
        .send()
        .await
        .map_err(|e| format!("Error de conexión con Docker Hub: {}", e))?;

    if !resp.status().is_success() {
        return Ok(TagsPage {
            tags: vec![],
            next: None,
        });
    }

    let data: HubTagsResponse = resp
        .json()
        .await
        .map_err(|e| format!("Error al parsear respuesta: {}", e))?;

    let mut tags: Vec<DockerHubTagResult> = Vec::new();
    let mut stored_tags: Vec<serde_json::Value> = Vec::new();
    let mut versions: Vec<String> = Vec::new();
    let mut variants: Vec<String> = Vec::new();

    for item in data.results {
        if let Some(content_type) = item.get("content_type").and_then(serde_json::Value::as_str) {
            if content_type != "image" {
                continue;
            }
        }

        let name = match item.get("name").and_then(serde_json::Value::as_str) {
            Some(n) => n.to_string(),
            None => continue,
        };
        let (version, variant) = parse_tag(&name);

        let mut obj = sanitize_tag_object(item);
        if let Some(o) = obj.as_object_mut() {
            o.insert("version".to_string(), serde_json::json!(version));
            o.insert("variant".to_string(), serde_json::json!(variant));
        }

        tags.push(DockerHubTagResult {
            name: name.clone(),
            full_size: obj
                .get("full_size")
                .and_then(serde_json::Value::as_i64)
                .unwrap_or(0),
            last_updated: obj
                .get("last_updated")
                .and_then(serde_json::Value::as_str)
                .unwrap_or("")
                .to_string(),
            version: version.clone(),
            variant: variant.clone(),
        });
        stored_tags.push(obj);

        if !versions.contains(&version) {
            versions.push(version.clone());
        }
        if !variants.contains(&variant) {
            variants.push(variant.clone());
        }
    }

    let tags_json = serde_json::to_string(&stored_tags).unwrap_or_else(|_| "[]".to_string());
    let versions_json = serde_json::to_string(&versions).unwrap_or_else(|_| "[]".to_string());
    let variants_json = serde_json::to_string(&variants).unwrap_or_else(|_| "[]".to_string());

    let next = data.next.clone();
    let previous = data.previous.clone();
    let count = data.count;
    let fetched_at = now_iso();

    sqlx::query(&format!(
        "INSERT INTO {} 
            (namespace, repository, url_query, url_next, url_previous, count, tags, tags_versions, tags_variants, fetched_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT (namespace, repository, url_query) DO UPDATE SET
            url_next = excluded.url_next,
            url_previous = excluded.url_previous,
            count = excluded.count,
            tags = excluded.tags,
            tags_versions = excluded.tags_versions,
            tags_variants = excluded.tags_variants,
            fetched_at = excluded.fetched_at",
        tables::TABLE_CACHE_PROJECTS_DOCKER_TAGS
    ))
    .bind(namespace)
    .bind(repository)
    .bind(url)
    .bind(&next)
    .bind(&previous)
    .bind(count)
    .bind(&tags_json)
    .bind(&versions_json)
    .bind(&variants_json)
    .bind(&fetched_at)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(TagsPage { tags, next })
}

#[tauri::command]
pub async fn cache_docker_tags(
    app: AppHandle,
    image_name: String,
    tag: Option<String>,
) -> Result<Vec<DockerHubTagResult>, String> {
    let (pool, _) = open_pool(&app).await?;
    let (namespace, repository) = parse_image_name(&image_name);

    let base_url = format!(
        "https://hub.docker.com/v2/repositories/{}/{}/tags?page_size={}&ordering=last_updated",
        urlencoding::encode(&namespace),
        urlencoding::encode(&repository),
        TAGS_PAGE_SIZE,
    );

    let mut current_url = base_url;

    for _ in 0..MAX_TAG_PAGES {
        let page = get_or_fetch_tags_page(&pool, &namespace, &repository, &current_url).await?;

        if let Some(tag) = &tag {
            let found: Vec<DockerHubTagResult> = page
                .tags
                .into_iter()
                .filter(|t| &t.name == tag)
                .collect();
            if !found.is_empty() {
                return Ok(found);
            }
            match page.next {
                Some(next) => current_url = next,
                None => return Ok(vec![]),
            }
        } else {
            return Ok(page.tags);
        }
    }

    Ok(vec![])
}
