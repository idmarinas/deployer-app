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

/// Timeout para comandos individuales (segundos).
const COMMAND_TIMEOUT_SECS: u64 = 10;

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
    pub memory: String,
    pub disk: String,
    pub distribution: String,
    pub system_info: HostSystemInfo,
}

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

    // 2. Ejecutar comandos para obtener info del sistema
    let uname = run_cmd(&mut session, "uname -a").await.unwrap_or_default();
    let os_release = run_cmd(&mut session, "cat /etc/os-release 2>/dev/null | grep -E '^(PRETTY_NAME|VERSION)=' | head -2").await.unwrap_or_default();
    let uptime = run_cmd(&mut session, "uptime -p 2>/dev/null || uptime").await.unwrap_or_default();
    let cpu_cores = run_cmd(&mut session, "nproc 2>/dev/null || echo '-'").await.unwrap_or_default();
    let memory = run_cmd(&mut session, "free -h 2>/dev/null | awk '/^Mem:/{printf \"%s / %s\", $3, $2}' || echo '-'").await.unwrap_or_default();
    let disk = run_cmd(&mut session, "df -h / 2>/dev/null | awk 'NR==2{printf \"%s / %s (%s)\", $3, $2, $5}' || echo '-'").await.unwrap_or_default();

    // 3. Detectar package manager
    let pm = detect_package_manager(&mut session).await;

    // 4. Detectar distribución
    let distribution = detect_distribution(&mut session).await;

    // 5. Detectar kernel, arch y datos estáticos del sistema
    let kernel = run_cmd(&mut session, "uname -r 2>/dev/null").await.unwrap_or_default();
    let arch = run_cmd(&mut session, "uname -m 2>/dev/null").await.unwrap_or_default();
    let pm_version = run_cmd(&mut session, &format!("{} --version 2>/dev/null | head -1", pm)).await.unwrap_or_default();

    let memory_total = run_cmd(&mut session, "free -h 2>/dev/null | awk '/^Mem:/{print $2}' || echo '-'").await.unwrap_or_default();
    let disk_total = run_cmd(&mut session, "df -h / 2>/dev/null | awk 'NR==2{print $2}' || echo '-'").await.unwrap_or_default();
    let os_pretty = run_cmd(&mut session, "cat /etc/os-release 2>/dev/null | grep '^PRETTY_NAME=' | cut -d'\"' -f2 || echo '-'").await.unwrap_or_default();

    let _ = session.disconnect().await;

    // 6. Construir system_info y guardar en BD
    let system_info = HostSystemInfo {
        package_manager: pm.clone(),
        package_manager_version: pm_version.trim().to_string(),
        kernel: kernel.trim().to_string(),
        arch: arch.trim().to_string(),
        cpu_cores: cpu_cores.trim().to_string(),
        memory_total: memory_total.trim().to_string(),
        disk_total: disk_total.trim().to_string(),
        os_release: os_pretty.trim().to_string(),
    };

    if let Ok(json) = system_info.to_json() {
        let _ = update_host_system_info(&app, host_id, &distribution, &json).await;
    }

    // 7. Devolver resultado
    Ok(CommandResponse::ok(
        HostStatusInfo {
            uname: uname.trim().to_string(),
            os_release: os_release.trim().to_string(),
            uptime: uptime.trim().to_string(),
            cpu_cores: cpu_cores.trim().to_string(),
            memory: memory.trim().to_string(),
            disk: disk.trim().to_string(),
            distribution: distribution.clone(),
            system_info,
        },
        "hosts.success.status_checked",
    ))
}

// ============================================================================
// Helpers
// ============================================================================

/// Ejecuta un comando SSH simple y devuelve el output (o None si falla).
async fn run_cmd(
    session: &mut crate::commands::ssh::SshSession,
    command: &str,
) -> Option<String> {
    match run_ssh_command(session, command, COMMAND_TIMEOUT_SECS).await {
        Ok((output, _exit_code)) => {
            let trimmed = output.trim().to_string();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            }
        }
        Err(_) => None,
    }
}

/// Detecta el package manager instalado en el servidor.
async fn detect_package_manager(
    session: &mut crate::commands::ssh::SshSession,
) -> String {
    for pm in &["apt", "yum", "dnf"] {
        if let Some(output) = run_cmd(session, &format!("command -v {} 2>/dev/null", pm)).await {
            if !output.is_empty() {
                return pm.to_string();
            }
        }
    }
    "unknown".to_string()
}

/// Detecta la distribución del SO.
async fn detect_distribution(
    session: &mut crate::commands::ssh::SshSession,
) -> String {
    if let Some(output) = run_cmd(
        session,
        "cat /etc/os-release 2>/dev/null | grep '^PRETTY_NAME=' | cut -d'\"' -f2",
    )
    .await
    {
        if !output.is_empty() {
            return output;
        }
    }

    if let Some(output) = run_cmd(session, "lsb_release -d 2>/dev/null | cut -f2").await {
        if !output.is_empty() {
            return output;
        }
    }

    run_cmd(session, "uname -srm")
        .await
        .unwrap_or_else(|| "Desconocido".to_string())
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
    let pool = SqlitePool::connect_with(options)
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
