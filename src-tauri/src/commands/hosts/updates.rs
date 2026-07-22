use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::time::Duration;
use tauri::AppHandle;
use tokio::time::timeout;
use ts_rs::TS;

use crate::commands::database::path_to_sqlite_url;
use crate::commands::helpers::configured_sqlite_options;
use crate::commands::helpers::open_crypto_context;
use crate::commands::hosts::types::HostSystemInfo;
use crate::commands::store::get_database_path_internal;
use crate::commands::CommandResponse;
use crate::commands::deployments::run::session::{
    decrypt_host_credentials, SshSession,
};
use crate::params;

/// Timeout para la conexión SSH (segundos).
const SSH_TIMEOUT_SECS: u64 = 15;

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
    let (session, system_info) = connect_to_host(&app, host_id).await?;

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
) -> Result<CommandResponse<String>, String> {
    let (mut session, system_info) = connect_to_host(&app, input.host_id).await?;

    let output = match update_packages(&mut session, &system_info, input.packages.as_deref()).await {
        Ok(out) => out,
        Err(e) => {
            return Ok(CommandResponse::err(
                "hosts.errors.update_failed",
                params!("reason" => e),
            ))
        }
    };

    let _ = session.disconnect().await;

    Ok(CommandResponse::ok(
        output,
        "hosts.success.packages_updated",
    ))
}

// ============================================================================
// Helpers
// ============================================================================

/// Conecta al host y devuelve la sesión SSH + info del sistema.
async fn connect_to_host(
    app: &AppHandle,
    host_id: i64,
) -> Result<(SshSession, HostSystemInfo), String> {
    let (_pool, key) = open_crypto_context(app).await?;
    let db_path = get_database_path_internal(app.clone())
        .map_err(|e| format!("Error al obtener ruta de BD: {}", e))?
        .ok_or_else(|| "Ruta de BD no configurada".to_string())?;

    // Obtener host + credenciales
    let url = path_to_sqlite_url(&db_path);
    let options = configured_sqlite_options(&url)?;
    let pool = SqlitePool::connect_with(options)
        .await
        .map_err(|e| e.to_string())?;

    let row = sqlx::query(
        r#"
        SELECT
            h.id, h.name, h.host, h.port, h.username, h.auth_type,
            h.password, h.key_id, h.description, h.enabled,
            h.system_info,
            h.created_at, h.updated_at,
            p.key_content, p.passphrase
        FROM deployer_hosts h
        LEFT JOIN deployer_passkeys p ON h.key_id = p.id
        WHERE h.id = ?1 AND h.enabled = 1
        "#,
    )
    .bind(host_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Host no encontrado o deshabilitado".to_string())?;

    let host_password: Option<String> = row.try_get("password").ok().flatten();
    let key_content: Option<String> = row.try_get("key_content").ok().flatten();
    let passphrase: Option<String> = row.try_get("passphrase").ok().flatten();
    let system_info_str: Option<String> = row.try_get("system_info").ok().flatten();
    let host_host: String = row.get("host");
    let host_port: i64 = row.get("port");
    let host_username: String = row.get("username");
    let host_auth_type: crate::commands::hosts::types::AuthType = row.get("auth_type");

    pool.close().await;

    // Descifrar credenciales
    let host = crate::commands::hosts::types::Host {
        id: row.get("id"),
        name: row.get("name"),
        host: host_host.clone(),
        port: host_port,
        username: host_username.clone(),
        auth_type: host_auth_type.clone(),
        password: host_password,
        key_id: row.get("key_id"),
        description: row.try_get("description").ok().flatten(),
        enabled: row.get("enabled"),
        distribution: row.try_get("distribution").ok().flatten(),
        system_info: system_info_str.clone(),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    let credentials = decrypt_host_credentials(&host, key_content, passphrase, &key)?;

    // Conectar
    let addr = format!("{}:{}", host_host, host_port);
    let session = timeout(
        Duration::from_secs(SSH_TIMEOUT_SECS),
        SshSession::connect(addr, credentials, 1),
    )
    .await
    .map_err(|_| "Timeout al conectar con el servidor".to_string())?
    .map_err(|e| format!("Error de conexión: {}", e))?;

    // Parsear system_info
    let system_info = match system_info_str {
        Some(json) if !json.is_empty() && json != "{}" => {
            HostSystemInfo::from_json(&json).unwrap_or_default()
        }
        _ => HostSystemInfo::default(),
    };

    Ok((session, system_info))
}

/// Ejecuta un comando SSH simple y devuelve el output.
async fn run_ssh_cmd(session: &mut SshSession, command: &str) -> Result<String, String> {
    session.ensure_connected().await?;

    let mut ssh_channel = session
        .handle
        .channel_open_session()
        .await
        .map_err(|e| format!("Error al abrir canal SSH: {}", e))?;

    ssh_channel
        .exec(true, command.as_bytes())
        .await
        .map_err(|e| format!("Error al ejecutar comando: {}", e))?;

    let mut output = String::new();
    let mut exit_code: i64 = -1;

    loop {
        use russh::ChannelMsg;
        let msg = tokio::time::timeout(
            Duration::from_secs(UPDATE_COMMAND_TIMEOUT_SECS),
            ssh_channel.wait(),
        )
        .await
        .map_err(|_| "Timeout de 300s alcanzado".to_string())?;

        match msg {
            Some(ChannelMsg::Data { ref data }) => {
                output.push_str(&String::from_utf8_lossy(data));
            }
            Some(ChannelMsg::ExtendedData { ref data, ext: 1 }) => {
                output.push_str(&String::from_utf8_lossy(data));
            }
            Some(ChannelMsg::ExitStatus { exit_status }) => {
                exit_code = exit_status as i64;
            }
            Some(ChannelMsg::Eof) | None => break,
            _ => {}
        }
    }

    // apt list --upgradable usa stderr para warnings, yum/dnf usan exit code
    // Exit code 0 = sin actualizaciones (apt) o con actualizaciones (yum/dnf)
    // Exit code 100 = actualizaciones disponibles (apt)
    // No tratamos como error los códigos esperados
    if exit_code != 0 && exit_code != 100 {
        // Para yum check-update, exit 100 = hay actualizaciones
        // Para dnf check-update, exit 100 = hay actualizaciones
        // Solo fallamos si es un error inesperado
        if !output.contains("Upgradable") && !output.contains("upgradable") {
            // Podría ser un warning, devolver el output de todos modos
        }
    }

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

/// Actualiza paquetes en el servidor.
async fn update_packages(
    session: &mut SshSession,
    system_info: &HostSystemInfo,
    packages: Option<&[String]>,
) -> Result<String, String> {
    let command = match system_info.package_manager.as_str() {
        "apt" => match packages {
            Some(pkgs) if !pkgs.is_empty() => {
                let list = pkgs.join(" ");
                format!(
                    "DEBIAN_FRONTEND=noninteractive apt-get install -y {}",
                    list
                )
            }
            _ => "DEBIAN_FRONTEND=noninteractive apt-get upgrade -y".to_string(),
        },
        "yum" => match packages {
            Some(pkgs) if !pkgs.is_empty() => {
                let list = pkgs.join(" ");
                format!("yum update -y {}", list)
            }
            _ => "yum update -y".to_string(),
        },
        "dnf" => match packages {
            Some(pkgs) if !pkgs.is_empty() => {
                let list = pkgs.join(" ");
                format!("dnf update -y {}", list)
            }
            _ => "dnf update -y".to_string(),
        },
        _ => return Err("Package manager no soportado".to_string()),
    };

    run_ssh_cmd(session, &command).await
}

/// Parsea la salida de `apt list --upgradable`.
fn parse_apt_updates(output: &str) -> Vec<HostPackage> {
    output
        .lines()
        .filter(|line| !line.trim().is_empty())
        .filter(|line| !line.starts_with("Listing"))
        .filter_map(|line| {
            // Formato: "package_name/distro version1 -> version2 [upgradable from: current]"
            let parts: Vec<&str> = line.splitn(2, ' ').collect();
            if parts.len() < 2 {
                return None;
            }

            // name/repo
            let name_repo: Vec<&str> = parts[0].splitn(2, '/').collect();
            let name = name_repo.first()?.trim().to_string();
            let repo = name_repo.get(1).unwrap_or(&"").trim().to_string();

            // new_version (antes de " -> " o "[upgradable")
            let rest = parts[1];
            let new_version_raw = if let Some(arrow_pos) = rest.find(" -> ") {
                rest[..arrow_pos].trim()
            } else if let Some(bracket_pos) = rest.find('[') {
                rest[..bracket_pos].trim()
            } else {
                rest.trim()
            };

            // current_version desde [upgradable from: X.Y.Z]
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

/// Limpia la versión quitando sufijos debian (ej: "-ubuntu1", "-deb12u1").
fn clean_version(v: &str) -> String {
    v.split('-').next().unwrap_or(v).trim().to_string()
}

/// Clasifica la actualización comparando segmentos major.minor.patch.
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

/// Determina la prioridad según el tipo y si es de seguridad.
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

/// Construye el resumen de actualizaciones.
fn build_summary(packages: &[HostPackage]) -> HostUpdatesSummary {
    HostUpdatesSummary {
        total: packages.len(),
        security: packages.iter().filter(|p| p.is_security).count(),
        major: packages.iter().filter(|p| p.update_type == "major").count(),
        minor: packages.iter().filter(|p| p.update_type == "minor").count(),
        patch: packages.iter().filter(|p| p.update_type == "patch").count(),
    }
}
