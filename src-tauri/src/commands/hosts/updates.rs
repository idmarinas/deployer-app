use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::AppHandle;
use ts_rs::TS;

use crate::commands::database::path_to_sqlite_url;
use crate::commands::hosts::types::HostSystemInfo;
use crate::helpers::configured_sqlite_options;
use crate::response::CommandResponse;
use crate::ssh::{connect_to_host_by_id, run_ssh_command, SshSession};

/// Timeout para comandos de actualización (segundos). Puede ser largo.
const UPDATE_COMMAND_TIMEOUT_SECS: u64 = 300;

// ============================================================================
// Output
// ============================================================================

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

/// Actualiza paquetes en el servidor.
#[tauri::command]
pub async fn host_update_packages(
    app: AppHandle,
    input: HostUpdatePackagesInput,
) -> Result<CommandResponse<HostUpdateResult>, String> {
    let (mut session, system_info) = connect_and_load_system_info(&app, input.host_id).await?;

    let (command, output, exit_code) = update_packages(
        &mut session,
        &system_info,
        input.packages.as_deref(),
        input.use_sudo.unwrap_or(false),
    )
    .await;

    let _ = session.disconnect().await;

    let key = if exit_code == 0 {
        "tauri.hosts.success.packages_updated"
    } else {
        "tauri.hosts.errors.update_failed"
    };

    Ok(CommandResponse::ok(
        HostUpdateResult {
            command,
            output,
            exit_code,
        },
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
    let (session, _host_creds) = connect_to_host_by_id(app, host_id, 1, true).await?;

    // Leer system_info directamente de la BD
    let system_info = fetch_host_json_field::<HostSystemInfo>(app, host_id, "system_info")
        .await
        .unwrap_or_default();

    Ok((session, system_info))
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
                    "{sudo}DEBIAN_FRONTEND=noninteractive apt-get install --only-upgrade -y {list}"
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
        _ => return (String::new(), "Package manager no soportado".to_string(), 1),
    };

    match run_ssh_command(session, &command, UPDATE_COMMAND_TIMEOUT_SECS).await {
        Ok((output, exit_code)) => (command, output, exit_code),
        Err(e) => (command, e, 1),
    }
}
