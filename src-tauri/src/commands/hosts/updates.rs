use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use ts_rs::TS;

use crate::commands::hosts::types::HostSystemInfo;
use crate::commands::ssh::{connect_to_host_by_id, run_ssh_command, SshSession};
use crate::commands::CommandResponse;
use crate::params;

/// Timeout para comandos de actualización (segundos). Puede ser largo.
const UPDATE_COMMAND_TIMEOUT_SECS: u64 = 300;

// ============================================================================
// Output
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct HostPackage {
    pub name: String,
    pub current_version: String,
    pub available_version: String,
    /// Repositorio de origen (ej: "jammy-updates", "jammy-security").
    pub repo: String,
    /// Tipo de actualización: "major", "minor", "patch" o "unknown".
    pub update_type: String,
    /// True si el paquete proviene de un repositorio de seguridad.
    pub is_security: bool,
    /// Prioridad: "high", "medium" o "low".
    pub priority: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct HostUpdatesSummary {
    pub total: usize,
    pub security: usize,
    pub major: usize,
    pub minor: usize,
    pub patch: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct HostCheckUpdatesResult {
    pub packages: Vec<HostPackage>,
    pub summary: HostUpdatesSummary,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct HostUpdatePackagesInput {
    pub host_id: i64,
    /// Lista de paquetes a actualizar. None o vacío = todos.
    pub packages: Option<Vec<String>>,
    /// Si es true, se ejecuta el comando con sudo.
    #[serde(default)]
    pub use_sudo: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct HostUpdateResult {
    pub command: String,
    pub output: String,
    pub exit_code: i64,
}

// ============================================================================
// Comandos Tauri
// ============================================================================

/// Comprueba las actualizaciones de paquetes disponibles en el servidor.
#[tauri::command]
pub async fn host_check_updates(
    app: AppHandle,
    host_id: i64,
) -> Result<CommandResponse<HostCheckUpdatesResult>, String> {
    let (session, system_info) = connect_and_load_system_info(&app, host_id).await?;

    let packages = match check_updates(session, &system_info).await {
        Ok(pkgs) => pkgs,
        Err(e) => {
            return Ok(CommandResponse::err(
                "hosts.errors.updates_check_failed",
                params!("reason" => e),
            ))
        }
    };

    let summary = build_summary(&packages);

    Ok(CommandResponse::ok(
        HostCheckUpdatesResult { packages, summary },
        "hosts.success.updates_checked",
    ))
}

/// Actualiza paquetes en el servidor.
#[tauri::command]
pub async fn host_update_packages(
    app: AppHandle,
    input: HostUpdatePackagesInput,
) -> Result<CommandResponse<HostUpdateResult>, String> {
    let (mut session, system_info) = connect_and_load_system_info(&app, input.host_id).await?;

    let (command, output, exit_code) = update_packages(&mut session, &system_info, input.packages.as_deref(), input.use_sudo.unwrap_or(false)).await;

    let _ = session.disconnect().await;

    let key = if exit_code == 0 {
        "hosts.success.packages_updated"
    } else {
        "hosts.errors.update_failed"
    };

    Ok(CommandResponse::ok(
        HostUpdateResult { command, output, exit_code },
        key,
    ))
}

// ============================================================================
// Helpers
// ============================================================================

/// Conecta al host via helper compartido y carga la info del sistema desde BD.
async fn connect_and_load_system_info(
    app: &AppHandle,
    host_id: i64,
) -> Result<(SshSession, HostSystemInfo), String> {
    let (session, host) = connect_to_host_by_id(app, host_id, 1, true).await?;

    // Parsear system_info del Host
    let system_info = match host.system_info {
        Some(json) if !json.is_empty() && json != "{}" => {
            HostSystemInfo::from_json(&json).unwrap_or_default()
        }
        _ => HostSystemInfo::default(),
    };

    Ok((session, system_info))
}

/// Ejecuta un comando SSH simple y devuelve el output.
async fn run_ssh_cmd(session: &mut SshSession, command: &str) -> Result<String, String> {
    let (output, _exit_code) =
        run_ssh_command(session, command, UPDATE_COMMAND_TIMEOUT_SECS).await?;
    Ok(output)
}

/// Parsea la salida de actualizaciones según el package manager.
async fn check_updates(
    mut session: SshSession,
    system_info: &HostSystemInfo,
) -> Result<Vec<HostPackage>, String> {
    let output = match system_info.package_manager.as_str() {
        "apt" => {
            run_ssh_cmd(&mut session, "apt list --upgradable 2>/dev/null").await?
        }
        "yum" => {
            run_ssh_cmd(&mut session, "yum check-update 2>/dev/null").await?
        }
        "dnf" => {
            run_ssh_cmd(&mut session, "dnf check-update --quiet 2>/dev/null").await?
        }
        _ => {
            let _ = session.disconnect().await;
            return Err("Package manager no soportado".to_string());
        }
    };

    let _ = session.disconnect().await;

    let packages = match system_info.package_manager.as_str() {
        "apt" => parse_apt_updates(&output),
        "yum" | "dnf" => parse_yum_dnf_updates(&output),
        _ => vec![],
    };

    Ok(packages)
}

/// Actualiza paquetes en el servidor. Devuelve (command, output, exit_code).
async fn update_packages(
    session: &mut SshSession,
    system_info: &HostSystemInfo,
    packages: Option<&[String]>,
    use_sudo: bool,
) -> (String, String, i64) {
    let sudo = if use_sudo { "sudo " } else { "" };
    let command = match system_info.package_manager.as_str() {
        "apt" => match packages {
            Some(pkgs) if !pkgs.is_empty() => {
                let list = pkgs.join(" ");
                format!(
                    "{sudo}DEBIAN_FRONTEND=noninteractive apt-get install -y {list}"
                )
            }
            _ => format!("{sudo}DEBIAN_FRONTEND=noninteractive apt-get upgrade -y"),
        },
        "yum" => match packages {
            Some(pkgs) if !pkgs.is_empty() => {
                let list = pkgs.join(" ");
                format!("{sudo}yum update -y {list}")
            }
            _ => format!("{sudo}yum update -y"),
        },
        "dnf" => match packages {
            Some(pkgs) if !pkgs.is_empty() => {
                let list = pkgs.join(" ");
                format!("{sudo}dnf update -y {list}")
            }
            _ => format!("{sudo}dnf update -y"),
        },
        _ => {
            return (
                String::new(),
                "Package manager no soportado".to_string(),
                1,
            )
        }
    };

    match run_ssh_command(session, &command, UPDATE_COMMAND_TIMEOUT_SECS).await {
        Ok((output, exit_code)) => (command, output, exit_code),
        Err(e) => (command, e, 1),
    }
}

// ============================================================================
// Helpers de parseo
// ============================================================================

/// Parsea la salida de `apt list --upgradable`.
fn parse_apt_updates(output: &str) -> Vec<HostPackage> {
    output
        .lines()
        .filter(|line| !line.trim().is_empty())
        .filter(|line| !line.starts_with("Listing"))
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(2, ' ').collect();
            if parts.len() < 2 {
                return None;
            }

            let name_repo: Vec<&str> = parts[0].splitn(2, '/').collect();
            let name = name_repo.first()?.trim().to_string();
            let repo = name_repo.get(1).unwrap_or(&"").trim().to_string();

            let rest = parts[1];
            let new_version_raw = if let Some(arrow_pos) = rest.find(" -> ") {
                rest[..arrow_pos].trim()
            } else if let Some(bracket_pos) = rest.find('[') {
                rest[..bracket_pos].trim()
            } else {
                rest.trim()
            };

            let current_version_raw = if let Some(start) = line.find("[upgradable from: ") {
                let slice = &line[start + 18..];
                if let Some(end) = slice.find(']') {
                    slice[..end].trim()
                } else {
                    return None;
                }
            } else {
                return None;
            };

            let new_version = clean_version(new_version_raw);
            let current_version = clean_version(current_version_raw);

            let update_type = classify_update(&current_version, &new_version);
            let is_security = repo.to_lowercase().contains("security");
            let priority = get_priority(&update_type, is_security);

            Some(HostPackage {
                name,
                current_version,
                available_version: new_version,
                repo,
                update_type,
                is_security,
                priority,
            })
        })
        .collect()
}

/// Parsea la salida de `yum check-update` o `dnf check-update`.
fn parse_yum_dnf_updates(output: &str) -> Vec<HostPackage> {
    output
        .lines()
        .filter(|line| !line.trim().is_empty())
        .filter(|line| !line.starts_with("Last metadata") && !line.starts_with("Obsoletely"))
        .filter_map(|line| {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 {
                let name = parts[0].to_string();
                let available = parts[1].to_string();
                let current = parts.get(2).map(|s| s.to_string()).unwrap_or_default();

                if name.starts_with('.') || name == "Obsoleting" || name.contains("Updated") || name.contains("Installed") {
                    return None;
                }

                let update_type = classify_update(&current, &available);
                let priority = get_priority(&update_type, false);

                Some(HostPackage {
                    name,
                    current_version: current,
                    available_version: available,
                    repo: String::new(),
                    update_type,
                    is_security: false,
                    priority,
                })
            } else {
                None
            }
        })
        .collect()
}

// ============================================================================
// Funciones auxiliares de clasificación (lógica n8n)
// ============================================================================

fn clean_version(v: &str) -> String {
    let no_epoch = v.split(':').last().unwrap_or(v);
    no_epoch.split('-').next().unwrap_or(no_epoch).trim().to_string()
}

fn classify_update(current: &str, new: &str) -> String {
    let c: Vec<u32> = current.split('.').filter_map(|s| s.parse().ok()).collect();
    let n: Vec<u32> = new.split('.').filter_map(|s| s.parse().ok()).collect();

    if c.is_empty() || n.is_empty() {
        return "unknown".to_string();
    }

    if n.len() > 0 && c.len() > 0 && n[0] > c[0] {
        return "major".to_string();
    }
    if n.len() > 1 && c.len() > 1 && n[1] > c[1] {
        return "minor".to_string();
    }
    if n.len() > 2 && c.len() > 2 && n[2] > c[2] {
        return "patch".to_string();
    }

    "unknown".to_string()
}

fn get_priority(update_type: &str, is_security: bool) -> String {
    if is_security {
        return "high".to_string();
    }
    match update_type {
        "major" => "high".to_string(),
        "minor" => "medium".to_string(),
        _ => "low".to_string(),
    }
}

fn build_summary(packages: &[HostPackage]) -> HostUpdatesSummary {
    HostUpdatesSummary {
        total: packages.len(),
        security: packages.iter().filter(|p| p.is_security).count(),
        major: packages.iter().filter(|p| p.update_type == "major").count(),
        minor: packages.iter().filter(|p| p.update_type == "minor").count(),
        patch: packages.iter().filter(|p| p.update_type == "patch").count(),
    }
}
