use serde::Deserialize;
use sqlx::SqlitePool;
use tauri::AppHandle;

use crate::commands::database::path_to_sqlite_url;
use crate::commands::hosts::types::{HostStatusMetrics, HostSystemInfo};
use crate::helpers::configured_sqlite_options;
use crate::params;
use crate::response::CommandResponse;
use crate::ssh::{connect_to_host_by_id, run_ssh_command};

/// Timeout para comandos batch (segundos).
const BATCH_TIMEOUT_SECS: u64 = 15;

/// Cooldown por defecto para system_info (horas).
const DEFAULT_SYSTEM_INFO_COOLDOWN_HOURS: i64 = 24;

/// Cooldown por defecto para status_info (minutos).
const DEFAULT_STATUS_INFO_COOLDOWN_MINUTES: i64 = 15;

// ============================================================================
// Batch JSON structs (internos, para deserializar respuestas SSH)
// ============================================================================

#[derive(Debug, Deserialize)]
struct BatchSystemInfo {
    kernel: String,
    arch: String,
    cores: String,
    memory_total: String,
    disk_total: String,
    os_release: String,
    distribution: String,
    package_manager: String,
    package_manager_version: String,
}

#[derive(Debug, Deserialize)]
struct BatchMetrics {
    cpu: String,
    ram: String,
    disk: String,
    #[allow(dead_code)]
    uptime: String,
}

// ============================================================================
// Comandos bash batch
// ============================================================================

/// Batch 1: Info estática del sistema (kernel, arch, cores, RAM total, disco total, OS, dist, pm).
const BATCH_SYSTEM_INFO: &str = r#"bash -c '
esc() { printf "%s" "$1" | sed "s/\\\\/\\\\\\\\/g; s/\"/\\\\\"/g"; }

kernel=$(uname -r 2>/dev/null)
arch=$(uname -m 2>/dev/null)
cores=$(nproc 2>/dev/null || echo 1)
mem_total=$(free -b 2>/dev/null | awk "NR==2 {print \$2}")
disk_total=$(df -B1 / 2>/dev/null | awk "NR==2 {print \$2}")

os_release=""
dist=""
if [ -f /etc/os-release ]; then
  os_release=$(grep -E "^(PRETTY_NAME|VERSION)=" /etc/os-release 2>/dev/null | head -2 | tr "\n" " ")
  dist=$(grep "^PRETTY_NAME=" /etc/os-release 2>/dev/null | cut -d"\"" -f2)
fi

pm="unknown"
pm_ver=""
for p in apt yum dnf; do
  if command -v "$p" >/dev/null 2>&1; then
    pm="$p"
    pm_ver=$("$p" --version 2>/dev/null | head -1)
    break
  fi
done

printf "{\"kernel\":\"%s\",\"arch\":\"%s\",\"cores\":\"%s\",\"memory_total\":\"%s\",\"disk_total\":\"%s\",\"os_release\":\"%s\",\"distribution\":\"%s\",\"package_manager\":\"%s\",\"package_manager_version\":\"%s\"}" \
  "$(esc "$kernel")" "$(esc "$arch")" "$(esc "$cores")" \
  "$(esc "$mem_total")" "$(esc "$disk_total")" \
  "$(esc "$os_release")" "$(esc "$dist")" "$(esc "$pm")" "$(esc "$pm_ver")"
'"#;

/// Batch 2: Métricas dinámicas (CPU%, RAM, disco, uptime).
const BATCH_METRICS: &str = r#"bash -c '
read cpu user nice system idle iowait irq softirq steal < /proc/stat
sleep 1
read cpu2 user2 nice2 system2 idle2 iowait2 irq2 softirq2 steal2 < /proc/stat

idle_delta=$((idle2 - idle))
total1=$((user + nice + system + idle + iowait + irq + softirq))
total2=$((user2 + nice2 + system2 + idle2 + iowait2 + irq2 + softirq2))
total_delta=$((total2 - total1))

if [ "$total_delta" -gt 0 ]; then
  cpu_usage=$(awk "BEGIN {printf \"%.2f\", (1 - $idle_delta / $total_delta) * 100}")
else
  cpu_usage="0.00"
fi

ram_usage=$(free -b 2>/dev/null | awk "NR==2 {printf \"%.2f\", (1 - \$7/\$2) * 100}")

disk_usage=$(df / --output=used,size 2>/dev/null | awk "NR==2 {printf \"%.2f\", (\$1/\$2) * 100}")

uptime_out=$(uptime -p 2>/dev/null || uptime)

esc() { printf "%s" "$1" | sed "s/\\\\/\\\\\\\\/g; s/\"/\\\\\"/g"; }

printf "{\"cpu\":\"%s\",\"ram\":\"%s\",\"disk\":\"%s\",\"uptime\":\"%s\"}" \
  "$cpu_usage" "$ram_usage" "$disk_usage" "$(esc "$uptime_out")"
'"#;

// ============================================================================
// Comandos Tauri
// ============================================================================

/// Comando que recupera y guarda la información estática del servidor (system_info).
/// Respeta cooldown configurable (default 24h).
#[tauri::command]
pub async fn host_check_system_info(
    app: AppHandle,
    host_id: i64,
) -> Result<CommandResponse<HostSystemInfo>, String> {
    // 1. Conectar al host
    let (mut session, _host_creds) = match connect_to_host_by_id(&app, host_id, 1, true).await {
        Ok(result) => result,
        Err(e) => {
            if e.contains("Timeout") {
                return Ok(CommandResponse::err(
                    "tauri.hosts.errors.connection_timeout",
                    params!("timeout" => "15"),
                ));
            }
            return Ok(CommandResponse::err(
                "tauri.hosts.errors.connection_failed",
                params!("reason" => e),
            ));
        }
    };

    // 2. Verificar cooldown de system_info
    let cached_system_info: Option<HostSystemInfo> =
        fetch_host_json_field(&app, host_id, "system_info").await;

    let needs_refresh = match &cached_system_info {
        Some(sys) => match &sys.last_checked_at {
            Some(last_checked) => {
                let cooldown_hours = get_setting_i64(&app, "hosts.system_info_cooldown_hours")
                    .await
                    .unwrap_or(DEFAULT_SYSTEM_INFO_COOLDOWN_HOURS);
                is_expired(last_checked, cooldown_hours * 3600)
            }
            None => true,
        },
        None => true,
    };

    // 3. Batch de info estática solo si expiró el cooldown
    let system_info = if needs_refresh {
        let sys_json = run_batch(&mut session, BATCH_SYSTEM_INFO).await?;
        let batch_sys: BatchSystemInfo = serde_json::from_str(&sys_json)
            .map_err(|e| format!("Error al parsear info del sistema: {}", e))?;

        let now = chrono::Utc::now().to_rfc3339();
        let sys = HostSystemInfo {
            package_manager: batch_sys.package_manager.clone(),
            package_manager_version: batch_sys.package_manager_version,
            kernel: batch_sys.kernel,
            arch: batch_sys.arch,
            distribution: batch_sys.distribution.clone(),
            cpu_cores: batch_sys.cores,
            memory_total: format_bytes_unit(&batch_sys.memory_total),
            disk_total: format_bytes_unit(&batch_sys.disk_total),
            os_release: batch_sys.os_release,
            last_checked_at: Some(now),
        };

        if let Ok(json) = serde_json::to_string(&sys) {
            let _ = update_system_info(&app, host_id, &json).await;
        }

        sys
    } else {
        cached_system_info.unwrap_or_default()
    };

    let _ = session.disconnect().await;

    // 4. Devolver resultado
    Ok(CommandResponse::ok(
        system_info,
        "tauri.hosts.success.system_info_checked",
    ))
}

/// Comando que captura métricas dinámicas del servidor (CPU%, RAM%, DISK%).
/// Respeta cooldown configurable (default 15 min).
#[tauri::command]
pub async fn host_check_metrics(
    app: AppHandle,
    host_id: i64,
) -> Result<CommandResponse<HostStatusMetrics>, String> {
    // 1. Conectar al host
    let (mut session, _host_creds) = match connect_to_host_by_id(&app, host_id, 1, true).await {
        Ok(result) => result,
        Err(e) => {
            if e.contains("Timeout") {
                return Ok(CommandResponse::err(
                    "tauri.hosts.errors.connection_timeout",
                    params!("timeout" => "15"),
                ));
            }
            return Ok(CommandResponse::err(
                "tauri.hosts.errors.connection_failed",
                params!("reason" => e),
            ));
        }
    };

    // 2. Verificar cooldown de status_info
    let cached_metrics: Option<HostStatusMetrics> =
        fetch_host_json_field(&app, host_id, "status_info").await;

    if let Some(ref metrics) = cached_metrics {
        if let Some(ref last_checked) = metrics.last_checked_at {
            let cooldown_minutes = get_setting_i64(&app, "hosts.status_info_cooldown_minutes")
                .await
                .unwrap_or(DEFAULT_STATUS_INFO_COOLDOWN_MINUTES);
            if !is_expired(last_checked, cooldown_minutes * 60) {
                let _ = session.disconnect().await;
                return Ok(CommandResponse::ok(
                    metrics.clone(),
                    "tauri.hosts.success.metrics_checked",
                ));
            }
        }
    }

    // 3. Ejecutar batch: métricas dinámicas
    let met_json = run_batch(&mut session, BATCH_METRICS).await?;
    let met: BatchMetrics =
        serde_json::from_str(&met_json).map_err(|e| format!("Error al parsear métricas: {}", e))?;

    let _ = session.disconnect().await;

    // 4. Construir métricas con timestamp
    let now = chrono::Utc::now().to_rfc3339();
    let metrics = HostStatusMetrics {
        cpu_usage: met.cpu,
        ram_usage: met.ram,
        disk_usage: met.disk,
        last_checked_at: Some(now),
    };

    // 5. Persistir en BD
    if let Ok(json) = serde_json::to_string(&metrics) {
        let _ = update_status_info(&app, host_id, &json).await;
    }

    // 6. Devolver resultado
    Ok(CommandResponse::ok(
        metrics,
        "tauri.hosts.success.metrics_checked",
    ))
}

// ============================================================================
// Helpers
// ============================================================================

/// Ejecuta un comando batch SSH y devuelve el output crudo.
async fn run_batch(session: &mut crate::ssh::SshSession, command: &str) -> Result<String, String> {
    let (output, _exit_code) = run_ssh_command(session, command, BATCH_TIMEOUT_SECS).await?;
    Ok(output.trim().to_string())
}

/// Convierte bytes a string legible: "2254856192" → "2.1Gi".
fn format_bytes_unit(bytes_str: &str) -> String {
    let bytes: f64 = bytes_str.parse().unwrap_or(0.0);
    const KIB: f64 = 1024.0;
    const MIB: f64 = KIB * 1024.0;
    const GIB: f64 = MIB * 1024.0;
    const TIB: f64 = GIB * 1024.0;

    if bytes >= TIB {
        format!("{:.1}Ti", bytes / TIB)
    } else if bytes >= GIB {
        format!("{:.1}Gi", bytes / GIB)
    } else if bytes >= MIB {
        format!("{:.0}Mi", bytes / MIB)
    } else {
        format!("{:.0}Ki", bytes / KIB)
    }
}

/// Comprueba si un timestamp ISO 8601 ha expirado (más antiguo que `ttl_secs` segundos).
fn is_expired(last_checked_at: &str, ttl_secs: i64) -> bool {
    match chrono::DateTime::parse_from_rfc3339(last_checked_at) {
        Ok(parsed) => {
            let elapsed = chrono::Utc::now().signed_duration_since(parsed);
            elapsed.num_seconds() > ttl_secs
        }
        Err(_) => true,
    }
}

/// Lee un valor de deployer_settings y lo parsea a i64.
async fn get_setting_i64(app: &AppHandle, key: &str) -> Option<i64> {
    let db_path =
        crate::commands::database::store::get_database_path_internal(app.clone()).ok()??;
    let url = path_to_sqlite_url(&db_path);
    let options = configured_sqlite_options(&url).ok()?;
    let pool: SqlitePool = SqlitePool::connect_with(options).await.ok()?;

    let result = sqlx::query_scalar::<_, Option<String>>(
        "SELECT value FROM deployer_settings WHERE key = ?1",
    )
    .bind(key)
    .fetch_optional(&pool)
    .await
    .ok()
    .flatten()
    .flatten();

    pool.close().await;

    result.and_then(|v| v.parse::<i64>().ok())
}

/// Actualiza system_info en la BD.
async fn update_system_info(
    app: &AppHandle,
    host_id: i64,
    system_info_json: &str,
) -> Result<(), String> {
    let db_path = crate::commands::database::store::get_database_path_internal(app.clone())
        .map_err(|e| format!("Error al obtener ruta de BD: {}", e))?
        .ok_or_else(|| "Ruta de BD no configurada".to_string())?;

    let url = path_to_sqlite_url(&db_path);
    let options = configured_sqlite_options(&url)?;
    let pool: sqlx::Pool<sqlx::Sqlite> = SqlitePool::connect_with(options)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("UPDATE deployer_hosts SET system_info = ?1 WHERE id = ?2")
        .bind(system_info_json)
        .bind(host_id)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    pool.close().await;
    Ok(())
}

/// Actualiza status_info en la BD.
async fn update_status_info(
    app: &AppHandle,
    host_id: i64,
    status_info_json: &str,
) -> Result<(), String> {
    let db_path = crate::commands::database::store::get_database_path_internal(app.clone())
        .map_err(|e| format!("Error al obtener ruta de BD: {}", e))?
        .ok_or_else(|| "Ruta de BD no configurada".to_string())?;

    let url = path_to_sqlite_url(&db_path);
    let options = configured_sqlite_options(&url)?;
    let pool: sqlx::Pool<sqlx::Sqlite> = SqlitePool::connect_with(options)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("UPDATE deployer_hosts SET status_info = ?1 WHERE id = ?2")
        .bind(status_info_json)
        .bind(host_id)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    pool.close().await;
    Ok(())
}

/// Lee un campo JSON de deployer_hosts y lo deserializa.
async fn fetch_host_json_field<T: serde::de::DeserializeOwned>(
    app: &AppHandle,
    host_id: i64,
    field: &str,
) -> Option<T> {
    let db_path =
        crate::commands::database::store::get_database_path_internal(app.clone()).ok()??;
    let url = path_to_sqlite_url(&db_path);
    let options = configured_sqlite_options(&url).ok()?;
    let pool: SqlitePool = SqlitePool::connect_with(options).await.ok()?;

    let sql = format!("SELECT {} FROM deployer_hosts WHERE id = ?1", field);
    let raw: Option<String> = sqlx::query_scalar(&sql)
        .bind(host_id)
        .fetch_optional(&pool)
        .await
        .ok()
        .flatten()
        .flatten();

    pool.close().await;

    raw.and_then(|json| serde_json::from_str(&json).ok())
}
