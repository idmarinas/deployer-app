use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::time::Duration;
use tauri::AppHandle;
use tokio::time::timeout;
use ts_rs::TS;

use crate::commands::database::path_to_sqlite_url;
use crate::commands::helpers::configured_sqlite_options;
use crate::commands::helpers::open_crypto_context;
use crate::commands::hosts::types::{Host, HostSystemInfo};
use crate::commands::store::get_database_path_internal;
use crate::commands::CommandResponse;
use crate::commands::deployments::run::session::{
    decrypt_host_credentials, SshCredentials, SshSession,
};
use crate::params;

/// Timeout para la conexión SSH (segundos).
const SSH_TIMEOUT_SECS: u64 = 15;

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
    // 1. Contexto de cifrado
    let (_pool, _key) = match open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "hosts.errors.context_failed",
                params!("reason" => e),
            ))
        }
    };

    // 2. Ruta de BD
    let db_path = match get_database_path_internal(app.clone()) {
        Ok(Some(p)) => p,
        Ok(None) => {
            return Ok(CommandResponse::err(
                "hosts.errors.no_database_path",
                params!(),
            ))
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "hosts.errors.store_error",
                params!("reason" => e),
            ))
        }
    };

    // 3. Obtener host y credenciales
    let host = match fetch_host_for_status(&db_path, host_id).await {
        Ok(Some(h)) => h,
        Ok(None) => {
            return Ok(CommandResponse::err(
                "hosts.errors.not_found",
                params!("id" => host_id.to_string()),
            ))
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "hosts.errors.database_error",
                params!("reason" => e),
            ))
        }
    };

    // 4. Conectar vía SSH
    let addr = format!("{}:{}", host.host, host.port);
    let mut session = match timeout(
        Duration::from_secs(SSH_TIMEOUT_SECS),
        SshSession::connect(addr, host.credentials, 1),
    )
    .await
    {
        Ok(Ok(s)) => s,
        Ok(Err(e)) => {
            return Ok(CommandResponse::err(
                "hosts.errors.connection_failed",
                params!("reason" => e),
            ))
        }
        Err(_) => {
            return Ok(CommandResponse::err(
                "hosts.errors.connection_timeout",
                params!("timeout" => SSH_TIMEOUT_SECS.to_string()),
            ))
        }
    };

    // 5. Ejecutar comandos para obtener info del sistema
    let uname = run_cmd(&mut session, "uname -a").await.unwrap_or_default();
    let os_release = run_cmd(&mut session, "cat /etc/os-release 2>/dev/null | grep -E '^(PRETTY_NAME|VERSION)=' | head -2").await.unwrap_or_default();
    let uptime = run_cmd(&mut session, "uptime -p 2>/dev/null || uptime").await.unwrap_or_default();
    let cpu_cores = run_cmd(&mut session, "nproc 2>/dev/null || echo '-'").await.unwrap_or_default();
    let memory = run_cmd(&mut session, "free -h 2>/dev/null | awk '/^Mem:/{printf \"%s / %s\", $3, $2}' || echo '-'").await.unwrap_or_default();
    let disk = run_cmd(&mut session, "df -h / 2>/dev/null | awk 'NR==2{printf \"%s / %s (%s)\", $3, $2, $5}' || echo '-'").await.unwrap_or_default();

    // 6. Detectar package manager
    let pm = detect_package_manager(&mut session).await;

    // 7. Detectar distribución
    let distribution = detect_distribution(&mut session).await;

    // 8. Detectar kernel, arch y datos estáticos del sistema
    let kernel = run_cmd(&mut session, "uname -r 2>/dev/null").await.unwrap_or_default();
    let arch = run_cmd(&mut session, "uname -m 2>/dev/null").await.unwrap_or_default();
    let pm_version = run_cmd(&mut session, &format!("{} --version 2>/dev/null | head -1", pm)).await.unwrap_or_default();

    // Datos estáticos para persistir (RAM total, disco total, cores, OS)
    let memory_total = run_cmd(&mut session, "free -h 2>/dev/null | awk '/^Mem:/{print $2}' || echo '-'").await.unwrap_or_default();
    let disk_total = run_cmd(&mut session, "df -h / 2>/dev/null | awk 'NR==2{print $2}' || echo '-'").await.unwrap_or_default();
    let os_pretty = run_cmd(&mut session, "cat /etc/os-release 2>/dev/null | grep '^PRETTY_NAME=' | cut -d'\"' -f2 || echo '-'").await.unwrap_or_default();

    let _ = session.disconnect().await;

    // 9. Construir system_info y guardar en BD
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
        let _ = update_host_system_info(&db_path, host_id, &distribution, &json).await;
    }

    // 10. Devolver resultado
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

/// Datos del host con credenciales ya descifradas, listos para SshSession.
struct HostForStatus {
    host: String,
    port: i64,
    credentials: SshCredentials,
}

/// Carga el host desde la BD, descifra credenciales y devuelve HostForStatus.
async fn fetch_host_for_status(db_path: &str, host_id: i64) -> Result<Option<HostForStatus>, String> {
    let url = path_to_sqlite_url(db_path);
    let options = configured_sqlite_options(&url)?.read_only(true);
    let pool = SqlitePool::connect_with(options)
        .await
        .map_err(|e| e.to_string())?;

    let row = sqlx::query(
        r#"
        SELECT
            h.id, h.name, h.host, h.port, h.username, h.auth_type,
            h.password, h.key_id, h.description, h.enabled,
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
    .map_err(|e| e.to_string())?;

    pool.close().await;

    let row = match row {
        Some(r) => r,
        None => return Ok(None),
    };

    let host = Host {
        id: row.get("id"),
        name: row.get("name"),
        host: row.get("host"),
        port: row.get("port"),
        username: row.get("username"),
        auth_type: row.get("auth_type"),
        password: row.get("password"),
        key_id: row.get("key_id"),
        description: row.get("description"),
        enabled: row.get("enabled"),
        distribution: row.try_get("distribution").ok().flatten(),
        system_info: row.try_get("system_info").ok().flatten(),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    let key_content: Option<String> = row.try_get("key_content").ok().flatten();
    let passphrase: Option<String> = row.try_get("passphrase").ok().flatten();

    // Obtener master key del crypto context para descifrar
    let master_key = crate::commands::helpers::get_master_key()
        .map_err(|e| format!("Error al obtener clave maestra: {}", e))?;

    let credentials = decrypt_host_credentials(&host, key_content, passphrase, &master_key)?;

    Ok(Some(HostForStatus {
        host: host.host,
        port: host.port,
        credentials,
    }))
}

/// Ejecuta un comando SSH simple y devuelve el output (o None si falla).
async fn run_cmd(session: &mut SshSession, command: &str) -> Option<String> {
    if session.ensure_connected().await.is_err() {
        return None;
    }

    let mut ssh_channel = session.handle.channel_open_session().await.ok()?;
    ssh_channel.exec(true, command.as_bytes()).await.ok()?;

    let mut output = String::new();
    loop {
        use russh::ChannelMsg;
        let msg = tokio::time::timeout(
            Duration::from_secs(COMMAND_TIMEOUT_SECS),
            ssh_channel.wait(),
        )
        .await
        .ok()?;

        match msg {
            Some(ChannelMsg::Data { ref data }) => {
                output.push_str(&String::from_utf8_lossy(data));
            }
            Some(ChannelMsg::Eof) | None => break,
            _ => {}
        }
    }

    let result = output.trim().to_string();
    if result.is_empty() {
        None
    } else {
        Some(result)
    }
}

/// Detecta el package manager instalado en el servidor.
async fn detect_package_manager(session: &mut SshSession) -> String {
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
async fn detect_distribution(session: &mut SshSession) -> String {
    // Intentar obtener PRETTY_NAME de /etc/os-release
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

    // Fallback: lsb_release
    if let Some(output) = run_cmd(session, "lsb_release -d 2>/dev/null | cut -f2").await {
        if !output.is_empty() {
            return output;
        }
    }

    // Fallback: uname
    run_cmd(session, "uname -srm").await.unwrap_or_else(|| "Desconocido".to_string())
}

/// Actualiza distribution y system_info en la BD.
async fn update_host_system_info(
    db_path: &str,
    host_id: i64,
    distribution: &str,
    system_info_json: &str,
) -> Result<(), String> {
    let url = path_to_sqlite_url(db_path);
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
