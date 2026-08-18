use tauri::AppHandle;
use serde::Deserialize;

use crate::helpers::open_pool;
use super::types::{DockerHubImageResult, DockerHubSearchCache};

const SEARCH_CACHE_TTL_SECONDS: i64 = 3600;
const SEARCH_PAGE_SIZE: u32 = 25;

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

#[tauri::command]
pub async fn cache_docker_search(
    app: AppHandle,
    query: String,
) -> Result<Vec<DockerHubImageResult>, String> {
    let (pool, _) = open_pool(&app).await?;

    let cached: Vec<DockerHubSearchCache> = sqlx::query_as(
        "SELECT id, query, namespace, repository, description, pull_count, star_count, fetched_at
         FROM deployer_docker_hub_search_cache WHERE query = ?1",
    )
    .bind(&query)
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    if !cached.is_empty() && cache_is_fresh(&cached[0].fetched_at, SEARCH_CACHE_TTL_SECONDS) {
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

    let url = format!(
        "https://hub.docker.com/v2/search/repositories/?query={}&page_size={}",
        urlencoding::encode(&query),
        SEARCH_PAGE_SIZE,
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
