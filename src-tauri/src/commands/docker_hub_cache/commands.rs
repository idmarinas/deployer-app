use tauri::AppHandle;
use serde::Deserialize;

use crate::commands::helpers::open_pool;
use super::types::{DockerHubImageResult, DockerHubSearchCache, DockerHubTagResult, DockerHubTagsCache};

const CACHE_TTL_SECONDS: i64 = 3600; // 1 hour
const SEARCH_PAGE_SIZE: u32 = 25;
const TAGS_PAGE_SIZE: u32 = 100;

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

fn cache_is_fresh(fetched_at: &str) -> bool {
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(fetched_at) {
        let elapsed = chrono::Utc::now().signed_duration_since(dt);
        elapsed.num_seconds() < CACHE_TTL_SECONDS
    } else {
        false
    }
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
    results: Vec<HubTagResult>,
}

#[derive(Deserialize)]
struct HubTagResult {
    name: String,
    full_size: Option<i64>,
    last_updated: Option<String>,
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
         FROM docker_hub_search_cache WHERE query = ?1",
    )
    .bind(&query)
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        eprintln!("[docker_hub_cache] cache query error: {}", e);
        e.to_string()
    })?;

    eprintln!("[docker_hub_cache] cache rows: {}", cached.len());
    if !cached.is_empty() && cache_is_fresh(&cached[0].fetched_at) {
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
        .map_err(|e| format!("Error al解析ar respuesta: {}", e))?;

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
            let _ = sqlx::query("DELETE FROM docker_hub_search_cache WHERE query = ?1")
                .bind(&query_clone)
                .execute(&pool_clone)
                .await;

            for r in &results_clone {
                let (ns, repo) = parse_image_name(&r.name);
                let _ = sqlx::query(
                    "INSERT INTO docker_hub_search_cache (query, namespace, repository, description, pull_count, star_count, fetched_at)
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
// Tags: Rust HTTP + SQLite cache
// ============================================================================

#[tauri::command]
pub async fn get_docker_hub_tags_cache(
    app: AppHandle,
    image_name: String,
) -> Result<Vec<DockerHubTagResult>, String> {
    let (pool, _) = open_pool(&app).await?;
    let (namespace, repository) = parse_image_name(&image_name);

    // Check cache
    let cached: Vec<DockerHubTagsCache> = sqlx::query_as(
        "SELECT id, namespace, repository, tag_name, last_updated, full_size, fetched_at
         FROM docker_hub_tags_cache WHERE namespace = ?1 AND repository = ?2",
    )
    .bind(&namespace)
    .bind(&repository)
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    if !cached.is_empty() && cache_is_fresh(&cached[0].fetched_at) {
        return Ok(cached.iter().map(|t| DockerHubTagResult {
            name: t.tag_name.clone(),
            full_size: t.full_size,
            last_updated: t.last_updated.clone().unwrap_or_default(),
        }).collect());
    }

    // Fetch from Docker Hub
    let url = format!(
        "https://hub.docker.com/v2/repositories/{}/{}/tags?page_size={}&ordering=last_updated",
        urlencoding::encode(&namespace),
        urlencoding::encode(&repository),
        TAGS_PAGE_SIZE,
    );

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("User-Agent", "DeployerApp/1.0")
        .send()
        .await
        .map_err(|e| format!("Error de conexión con Docker Hub: {}", e))?;

    if !resp.status().is_success() {
        return Ok(vec![]);
    }

    let data: HubTagsResponse = resp
        .json()
        .await
        .map_err(|e| format!("Error al解析ar respuesta: {}", e))?;

    let tags: Vec<DockerHubTagResult> = data.results.into_iter().map(|t| DockerHubTagResult {
        name: t.name,
        full_size: t.full_size.unwrap_or(0),
        last_updated: t.last_updated.unwrap_or_default(),
    }).collect();

    // Cache in background
    {
        let pool_clone = pool.clone();
        let ns_clone = namespace.clone();
        let repo_clone = repository.clone();
        let tags_clone = tags.clone();
        let now = now_iso();
        tokio::spawn(async move {
            let _ = sqlx::query(
                "DELETE FROM docker_hub_tags_cache WHERE namespace = ?1 AND repository = ?2",
            )
            .bind(&ns_clone)
            .bind(&repo_clone)
            .execute(&pool_clone)
            .await;

            for t in &tags_clone {
                let _ = sqlx::query(
                    "INSERT INTO docker_hub_tags_cache (namespace, repository, tag_name, last_updated, full_size, fetched_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                )
                .bind(&ns_clone)
                .bind(&repo_clone)
                .bind(&t.name)
                .bind(&t.last_updated)
                .bind(t.full_size)
                .bind(&now)
                .execute(&pool_clone)
                .await;
            }
        });
    }

    Ok(tags)
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

    let r1 = sqlx::query("DELETE FROM docker_hub_search_cache WHERE fetched_at < ?1")
        .bind(&cutoff)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let r2 = sqlx::query("DELETE FROM docker_hub_tags_cache WHERE fetched_at < ?1")
        .bind(&cutoff)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok((r1.rows_affected() + r2.rows_affected()) as i64)
}
