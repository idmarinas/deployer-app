use sqlx::SqlitePool;
use tauri::AppHandle;
use serde::Deserialize;

use crate::helpers::open_pool;
use super::types::{DockerHubImageResult, DockerHubSearchCache, DockerHubTagResult, DockerHubTagsCache};

const SEARCH_CACHE_TTL_SECONDS: i64 = 3600; // 1 hour
const TAGS_CACHE_TTL_SECONDS: i64 = 86400; // 24 hours
const SEARCH_PAGE_SIZE: u32 = 25;
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

/// Extrae la versión y la variante de un nombre de tag.
/// Misma lógica que `parseTag` del frontend: la versión es la parte anterior
/// al primer `-`; sin guion, la variante queda vacía.
fn parse_tag(tag_name: &str) -> (String, String) {
    if let Some(idx) = tag_name.find('-') {
        if idx > 0 {
            return (tag_name[..idx].to_string(), tag_name[idx + 1..].to_string());
        }
    }
    (tag_name.to_string(), String::new())
}

/// Elimina de un objeto de tag los campos que no se cachean y normaliza
/// `full_size` / `last_updated` para que el JSON siempre sea deserializable
/// en `DockerHubTagResult`.
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

// ============================================================================
// Docker Hub API Response Types
// ============================================================================

#[derive(Deserialize)]
struct HubSearchResponse {
    results: Vec<HubSearchResult>,
}

#[derive(Deserialize)]
struct HubSearchResult {
    repo_name: String,
    short_description: Option<String>,
    pull_count: Option<i64>,
    star_count: Option<i64>,
    is_official: Option<bool>,
}

#[derive(Deserialize)]
struct HubTagsResponse {
    count: i64,
    next: Option<String>,
    previous: Option<String>,
    results: Vec<serde_json::Value>,
}

// ============================================================================
// Search: Rust HTTP + SQLite cache
// ============================================================================

#[tauri::command]
pub async fn get_docker_hub_search_cache(
    app: AppHandle,
    query: String,
) -> Result<Vec<DockerHubImageResult>, String> {
    eprintln!("[docker_hub_cache] search called, query={}", query);
    let (pool, _) = open_pool(&app).await?;

    // Check cache
    let cached: Vec<DockerHubSearchCache> = sqlx::query_as(
        "SELECT id, query, namespace, repository, description, pull_count, star_count, fetched_at
         FROM deployer_docker_hub_search_cache WHERE query = ?1",
    )
    .bind(&query)
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        eprintln!("[docker_hub_cache] cache query error: {}", e);
        e.to_string()
    })?;

    eprintln!("[docker_hub_cache] cache rows: {}", cached.len());
    if !cached.is_empty() && cache_is_fresh(&cached[0].fetched_at, SEARCH_CACHE_TTL_SECONDS) {
        eprintln!("[docker_hub_cache] returning cached results");
        let mut results: Vec<DockerHubImageResult> = cached.iter().map(|r| DockerHubImageResult {
            name: if r.namespace == "library" {
                r.repository.clone()
            } else {
                format!("{}/{}", r.namespace, r.repository)
            },
            description: r.description.clone().unwrap_or_default(),
            pull_count: r.pull_count,
            star_count: r.star_count,
            official: r.namespace == "library",
        }).collect();
        results.sort_by(|a, b| b.official.cmp(&a.official));
        return Ok(results);
    }

    // Fetch from Docker Hub
    let url = format!(
        "https://hub.docker.com/v2/search/repositories/?query={}&page_size={}",
        urlencoding::encode(&query),
        SEARCH_PAGE_SIZE,
    );
    eprintln!("[docker_hub_cache] fetching URL: {}", url);

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("User-Agent", "DeployerApp/1.0")
        .send()
        .await
        .map_err(|e| {
            eprintln!("[docker_hub_cache] reqwest error: {}", e);
            format!("Error de conexión con Docker Hub: {}", e)
        })?;

    eprintln!("[docker_hub_cache] response status: {}", resp.status());
    if !resp.status().is_success() {
        return Ok(vec![]);
    }

    let data: HubSearchResponse = resp
        .json()
        .await
        .map_err(|e| format!("Error al parsear respuesta: {}", e))?;

    let mut results: Vec<DockerHubImageResult> = data.results.into_iter().map(|r| {
        let name = r.repo_name.clone();
        DockerHubImageResult {
            name,
            description: r.short_description.unwrap_or_default(),
            pull_count: r.pull_count.unwrap_or(0),
            star_count: r.star_count.unwrap_or(0),
            official: r.is_official.unwrap_or(false),
        }
    }).collect();

    results.sort_by(|a, b| b.official.cmp(&a.official));

    // Cache in background
    {
        let pool_clone = pool.clone();
        let query_clone = query.clone();
        let results_clone = results.clone();
        let now = now_iso();
        tokio::spawn(async move {
            let _ = sqlx::query("DELETE FROM deployer_docker_hub_search_cache WHERE query = ?1")
                .bind(&query_clone)
                .execute(&pool_clone)
                .await;

            for r in &results_clone {
                let (ns, repo) = parse_image_name(&r.name);
                let _ = sqlx::query(
                    "INSERT INTO deployer_docker_hub_search_cache (query, namespace, repository, description, pull_count, star_count, fetched_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                )
                .bind(&query_clone)
                .bind(&ns)
                .bind(&repo)
                .bind(&r.description)
                .bind(r.pull_count)
                .bind(r.star_count)
                .bind(&now)
                .execute(&pool_clone)
                .await;
            }
        });
    }

    Ok(results)
}

// ============================================================================
// Tags: Rust HTTP + SQLite cache (una fila por página consultada)
// ============================================================================

struct TagsPage {
    tags: Vec<DockerHubTagResult>,
    next: Option<String>,
}

/// Devuelve la página de tags para una URL concreta, consultando primero la
/// caché por `url_query` y haciendo la petición HTTP solo si no hay una fila
/// fresca (menos de 24 horas).
async fn get_or_fetch_tags_page(
    pool: &SqlitePool,
    namespace: &str,
    repository: &str,
    url: &str,
) -> Result<TagsPage, String> {
    let cached: Option<DockerHubTagsCache> = sqlx::query_as(
        "SELECT id, namespace, repository, url_query, url_next, url_previous, count, tags, tags_versions, tags_variants, fetched_at
         FROM deployer_docker_hub_tags_cache WHERE url_query = ?1",
    )
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

    // Fetch from Docker Hub
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
        // Solo se cachean tags con content_type "image"; si no existe el campo
        // se conserva defensivamente.
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

    sqlx::query(
        "INSERT INTO deployer_docker_hub_tags_cache
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
    )
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
pub async fn get_docker_hub_tags_cache(
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

// ============================================================================
// Cleanup
// ============================================================================

#[tauri::command]
pub async fn cleanup_docker_hub_cache(
    app: AppHandle,
    older_than_hours: i64,
) -> Result<i64, String> {
    let (pool, _) = open_pool(&app).await?;
    let cutoff =
        (chrono::Utc::now() - chrono::Duration::hours(older_than_hours)).to_rfc3339();

    let r1 = sqlx::query("DELETE FROM deployer_docker_hub_search_cache WHERE fetched_at < ?1")
        .bind(&cutoff)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let r2 = sqlx::query("DELETE FROM deployer_docker_hub_tags_cache WHERE fetched_at < ?1")
        .bind(&cutoff)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok((r1.rows_affected() + r2.rows_affected()) as i64)
}
