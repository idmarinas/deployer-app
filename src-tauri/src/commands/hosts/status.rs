use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::AppHandle;
use ts_rs::TS;

use crate::commands::database::path_to_sqlite_url;
use crate::commands::helpers::configured_sqlite_options;
use crate::commands::hosts::types::HostSystemInfo;
use crate::commands::ssh::{connect_to_host_by_id, run_ssh_command};
use crate::commands::CommandResponse;
use crate::params;

/// Timeout para comandos batch (segundos).
const BATCH_TIMEOUT_SECS: u64 = 15;

// ============================================================================
// Output
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct HostStatusInfo {
    pub uname: String,
    pub os_release: String,
    pub uptime: String,
    pub cpu_cores: String,
    pub cpu_usage: String,
    pub memory: String,
    pub disk: String,
    pub distribution: String,
    pub system_info: HostSystemInfo,
}

// ============================================================================
// Batch JSON structs (internos, para deserializar respuestas SSH)
// ============================================================================

#[derive(Debug, Deserialize)]
struct BatchSystemInfo {
    uname: String,
    kernel: String,
    arch: String,
    cores: String,
    os_release: String,
    distribution: String,
    package_manager: String,
    package_manager_version: String,
}

#[derive(Debug, Deserialize)]
struct BatchMetrics {
    cpu: String,
    ram_used: String,
    ram_total: String,
    disk_used: String,
    disk_total: String,
    uptime: String,
}

// ============================================================================
// Comandos bash batch
// ============================================================================

/// Batch 1: Info estática del sistema (uname, kernel, arch, cores, OS, dist, pm).
const BATCH_SYSTEM_INFO: &str = r#"bash -c '
esc() { printf "%s" "$1" | sed "s/\\\\/\\\\\\\\/g; s/\"/\\\\\"/g"; }

kernel=$(uname -r 2>/dev/null)
arch=$(uname -m 2>/dev/null)
cores=$(nproc 2>/dev/null || echo 1)
uname_full=$(uname -a 2>/dev/null)

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

printf "{\"uname\":\"%s\",\"kernel\":\"%s\",\"arch\":\"%s\",\"cores\":\"%s\",\"os_release\":\"%s\",\"distribution\":\"%s\",\"package_manager\":\"%s\",\"package_manager_version\":\"%s\"}" \
  "$(esc "$uname_full")" "$(esc "$kernel")" "$(esc "$arch")" "$(esc "$cores")" \
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

ram_info=$(free -b 2>/dev/null | awk "NR==2 {printf \"%s %s\", \$3, \$2}")
ram_used=$(echo "$ram_info" | awk "{print \$1}")
ram_total=$(echo "$ram_info" | awk "{print \$2}")

disk_info=$(df -B1 / 2>/dev/null | awk "NR==2 {printf \"%s %s\", \$3, \$2}")
disk_used=$(echo "$disk_info" | awk "{print \$1}")
disk_total=$(echo "$disk_info" | awk "{print \$2}")

uptime_out=$(uptime -p 2>/dev/null || uptime)

esc() { printf "%s" "$1" | sed "s/\\\\/\\\\\\\\/g; s/\"/\\\\\"/g"; }

printf "{\"cpu\":\"%s\",\"ram_used\":\"%s\",\"ram_total\":\"%s\",\"disk_used\":\"%s\",\"disk_total\":\"%s\",\"uptime\":\"%s\"}" \
  "$cpu_usage" "$ram_used" "$ram_total" "$disk_used" "$disk_total" "$(esc "$uptime_out")"
'"#;

// ============================================================================
// Comando Tauri
// ============================================================================

#[tauri::command]
pub async fn host_check_status(
    app: AppHandle,
    host_id: i64,
) -> Result<CommandResponse<HostStatusInfo>, String> {
    // 1. Conectar al host via helper compartido
    let (mut session, _host) = match connect_to_host_by_id(&app, host_id, 1, true).await {
        Ok(result) => result,
        Err(e) => {
            if e.contains("Timeout") {
                return Ok(CommandResponse::err(
                    "hosts.errors.connection_timeout",
                    params!("timeout" => "15"),
                ));
            }
            return Ok(CommandResponse::err(
                "hosts.errors.connection_failed",
                params!("reason" => e),
            ));
        }
    };

    // 2. Batch 1: info estática del sistema (1 canal SSH)
    let sys_json = run_batch(&mut session, BATCH_SYSTEM_INFO).await?;
    let sys: BatchSystemInfo = serde_json::from_str(&sys_json)
        .map_err(|e| format!("Error al parsear info del sistema: {}", e))?;

    // 3. Batch 2: métricas dinámicas (1 canal SSH)
    let met_json = run_batch(&mut session, BATCH_METRICS).await?;
    let met: BatchMetrics = serde_json::from_str(&met_json)
        .map_err(|e| format!("Error al parsear métricas: {}", e))?;

    let _ = session.disconnect().await;

    // 4. Formatear strings display
    let memory = format_bytes_display(&met.ram_used, &met.ram_total);
    let disk = format_bytes_display(&met.disk_used, &met.disk_total);

    // 5. Construir system_info y guardar en BD
    let system_info = HostSystemInfo {
        package_manager: sys.package_manager.clone(),
        package_manager_version: sys.package_manager_version,
        kernel: sys.kernel,
        arch: sys.arch,
        cpu_cores: sys.cores,
        memory_total: format_bytes_unit(&met.ram_total),
        disk_total: format_bytes_unit(&met.disk_total),
        os_release: sys.os_release,
    };

    if let Ok(json) = serde_json::to_string(&system_info) {
        let _ = update_host_system_info(&app, host_id, &sys.distribution, &json).await;
    }

    // 6. Devolver resultado
    Ok(CommandResponse::ok(
        HostStatusInfo {
            uname: sys.uname,
            os_release: system_info.os_release.clone(),
            uptime: met.uptime,
            cpu_cores: system_info.cpu_cores.clone(),
            cpu_usage: format!("{}%", met.cpu),
            memory,
            disk,
            distribution: sys.distribution,
            system_info,
        },
        "hosts.success.status_checked",
    ))
}

// ============================================================================
// Helpers
// ============================================================================

/// Ejecuta un comando batch SSH y devuelve el output crudo.
async fn run_batch(
    session: &mut crate::commands::ssh::SshSession,
    command: &str,
) -> Result<String, String> {
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

/// Formatea "used_bytes total_bytes" → "2.1Gi / 7.7Gi".
fn format_bytes_display(used_str: &str, total_str: &str) -> String {
    let used = format_bytes_unit(used_str);
    let total = format_bytes_unit(total_str);
    format!("{} / {}", used, total)
}

/// Actualiza distribution y system_info en la BD.
async fn update_host_system_info(
    app: &AppHandle,
    host_id: i64,
    distribution: &str,
    system_info_json: &str,
) -> Result<(), String> {
    let db_path = crate::commands::store::get_database_path_internal(app.clone())
        .map_err(|e| format!("Error al obtener ruta de BD: {}", e))?
        .ok_or_else(|| "Ruta de BD no configurada".to_string())?;

    let url = path_to_sqlite_url(&db_path);
    let options = configured_sqlite_options(&url)?;
    let pool: sqlx::Pool<sqlx::Sqlite> = SqlitePool::connect_with(options)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query(
        "UPDATE deployer_hosts SET distribution = ?1, system_info = ?2 WHERE id = ?3",
    )
    .bind(distribution)
    .bind(system_info_json)
    .bind(host_id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    pool.close().await;
    Ok(())
}
