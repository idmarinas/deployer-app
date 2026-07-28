use sqlx::SqlitePool;
use tauri::ipc::Channel;
use tokio::time::Instant;

use crate::commands::deployments::executions::types::{DeploymentExecution, ExecutionStatus};
use crate::commands::deployments::types::{Deployment, DeploymentStatus};
use crate::commands::hosts::types::Host;
use crate::commands::projects::tasks::types::{OnFailure, TaskConfig};
use crate::commands::tasks::types::TaskType;
use crate::crud;

use crate::ssh::{decrypt_host_credentials, SshSession};

use super::interpolator::{build_snapshot, evaluate_condition};
use super::sftp_executor;
use super::ssh_executor;
use super::types::{ProgressEvent, ResolvedTask, RunDeploymentInput, VariableSnapshot};

// ============================================================================
// Punto de entrada principal del runner
// ============================================================================

pub async fn run(
    pool: SqlitePool,
    key: Vec<u8>,
    input: RunDeploymentInput,
    channel: Channel<ProgressEvent>,
) -> Result<(), String> {
    let deployment_id = input.deployment_id;
    let max_reconnect = input.ssh_reconnect_attempts.unwrap_or(3);

    // ── 1. Cargar deployment ─────────────────────────────────────────────────
    let deployment = load_deployment(&pool, &key, deployment_id).await?;

    match deployment.status {
        DeploymentStatus::Running => {
            return Err("El deployment ya está en ejecución".to_string());
        }
        DeploymentStatus::Success => {
            let pending = count_non_success_executions(&pool, deployment_id).await?;
            if pending == 0 {
                return Err(
                    "El deployment ya completó todas sus tareas correctamente".to_string()
                );
            }
        }
        _ => {}
    }

    // ── 2. Cargar proyecto ───────────────────────────────────────────────────
    let project = load_project(&pool, &key, deployment.project_id).await?;

    // ── 3. Cargar host activo del proyecto ───────────────────────────────────
    let (host, key_content, passphrase) =
        load_project_host(&pool, deployment.project_id).await?;

    // ── 4. Construir snapshot de variables ───────────────────────────────────
    let snapshot = build_snapshot(&pool, &key, &deployment, &project, &host).await?;

    // ── 5. Cargar y resolver project_tasks ───────────────────────────────────
    let resolved_tasks = load_resolved_tasks(&pool, &snapshot, deployment.project_id).await?;
    let total_tasks = resolved_tasks.len() as u32;

    // ── 6. Marcar deployment como Running ────────────────────────────────────
    update_deployment_status(
        &pool,
        deployment_id,
        DeploymentStatus::Running,
        Some(chrono::Utc::now().to_rfc3339()),
        None,
        None,
    )
    .await?;

    let _ = channel.send(ProgressEvent::DeploymentStarted {
        deployment_id,
        total_tasks,
    });

    // ── 7. Abrir sesión SSH ──────────────────────────────────────────────────
    let credentials = decrypt_host_credentials(&host, key_content, passphrase, &key)?;
    let addr = format!("{}:{}", host.host, host.port);

    let mut ssh_session = match SshSession::connect(addr, credentials, max_reconnect).await {
        Ok(s) => s,
        Err(e) => {
            let _ = update_deployment_status(
                &pool,
                deployment_id,
                DeploymentStatus::Failed,
                None,
                Some(chrono::Utc::now().to_rfc3339()),
                Some(0),
            )
            .await;
            let _ = channel.send(ProgressEvent::DeploymentFinished {
                deployment_id,
                status: DeploymentStatus::Failed,
                duration_seconds: 0,
            });
            return Err(format!("Error al conectar con el servidor SSH: {}", e));
        }
    };

    // ── 8. Ejecutar tareas ───────────────────────────────────────────────────
    let deploy_start = Instant::now();
    let mut deployment_failed = false;
    let mut stop_requested = false;

    for (order, task) in resolved_tasks.iter().enumerate() {
        if stop_requested {
            skip_task(
                &pool,
                &key,
                deployment_id,
                host.id,
                task,
                order as u32,
                "Deployment detenido por fallo anterior",
                &channel,
            )
            .await;
            continue;
        }

        // Evaluar condición de la task
        if let Some(ref condition) = task.condition {
            if !evaluate_condition(condition, &snapshot) {
                skip_task(
                    &pool,
                    &key,
                    deployment_id,
                    host.id,
                    task,
                    order as u32,
                    "Condición no cumplida",
                    &channel,
                )
                .await;
                continue;
            }
        }

        // Obtener o crear execution
        let execution_id =
            get_or_create_execution(&pool, &key, deployment_id, host.id, task).await?;

        // Si ya está en success (reanudación), saltarla
        if is_execution_success(&pool, execution_id).await? {
            let _ = channel.send(ProgressEvent::TaskSkipped {
                execution_id,
                task_name: task.task_name.clone(),
                reason: "Ya completada en ejecución anterior".to_string(),
            });
            continue;
        }

        let _ = channel.send(ProgressEvent::TaskPending {
            execution_id,
            task_name: task.task_name.clone(),
            order: order as u32,
        });

        // Ejecutar con reintentos
        let task_result = execute_with_retry(
            &mut ssh_session,
            task,
            execution_id,
            &pool,
            &channel,
            &snapshot,
        )
        .await;

        match task_result {
            Ok(0) => {
                // Success — BD ya actualizada en execute_with_retry
            }
            Ok(exit_code) => match task.on_failure {
                OnFailure::Stop => {
                    deployment_failed = true;
                    stop_requested = true;
                }
                OnFailure::Continue => {
                    let _ = channel.send(ProgressEvent::OutputChunk {
                        execution_id,
                        chunk: format!(
                            "[on_failure=continue] exit_code={}, continuando con la siguiente tarea\n",
                            exit_code
                        ),
                    });
                }
                OnFailure::Retry => {
                    // Reintentos ya agotados en execute_with_retry
                    deployment_failed = true;
                    stop_requested = true;
                }
            },
            Err(e) => {
                // Error de infraestructura (SSH caído, timeout, etc.)
                update_execution(
                    &pool,
                    execution_id,
                    ExecutionStatus::Failed,
                    Some(-1),
                    None,
                    Some(e),
                    0,
                )
                .await;

                let _ = channel.send(ProgressEvent::TaskFinished {
                    execution_id,
                    task_name: task.task_name.clone(),
                    status: ExecutionStatus::Failed,
                    exit_code: Some(-1),
                    duration_seconds: 0,
                });

                match task.on_failure {
                    OnFailure::Continue => {}
                    OnFailure::Stop | OnFailure::Retry => {
                        deployment_failed = true;
                        stop_requested = true;
                    }
                }
            }
        }
    }

    // ── 9. Cerrar sesión SSH ─────────────────────────────────────────────────
    ssh_session.disconnect().await;

    // ── 10. Estado final del deployment ──────────────────────────────────────
    let duration_seconds = deploy_start.elapsed().as_secs() as i64;
    let final_status = if deployment_failed {
        DeploymentStatus::Failed
    } else {
        DeploymentStatus::Success
    };

    update_deployment_status(
        &pool,
        deployment_id,
        final_status.clone(),
        None,
        Some(chrono::Utc::now().to_rfc3339()),
        Some(duration_seconds),
    )
    .await?;

    let _ = channel.send(ProgressEvent::DeploymentFinished {
        deployment_id,
        status: final_status,
        duration_seconds,
    });

    Ok(())
}

// ============================================================================
// Ejecución de una task con reintentos
// ============================================================================

async fn execute_with_retry(
    ssh_session: &mut SshSession,
    task: &ResolvedTask,
    execution_id: i64,
    pool: &SqlitePool,
    channel: &Channel<ProgressEvent>,
    snapshot: &VariableSnapshot,
) -> Result<i64, String> {
    // retry_count es el número de reintentos adicionales tras el primer intento
    let max_attempts = task.retry_count + 1;
    let mut last_error: Option<String> = None;

    for attempt in 0..max_attempts {
        if attempt == 0 {
            update_execution_started(pool, execution_id, attempt).await;
            let _ = channel.send(ProgressEvent::TaskStarted {
                execution_id,
                task_name: task.task_name.clone(),
            });
        } else {
            let _ = channel.send(ProgressEvent::TaskRetrying {
                execution_id,
                attempt,
                max_attempts: task.retry_count,
                delay_secs: task.retry_delay,
            });
            tokio::time::sleep(std::time::Duration::from_secs(task.retry_delay as u64)).await;
            // Actualizar retry_attempt en BD
            update_execution_started(pool, execution_id, attempt).await;
        }

        let exec_result: Result<(i64, String, String, i64), String> = match task.task_type {
            TaskType::Command => {
                let cmd = task
                    .command
                    .as_deref()
                    .map(|c| snapshot.interpolate(c))
                    .unwrap_or_default();
                ssh_executor::execute_command(ssh_session, task, execution_id, &cmd, channel)
                    .await
                    .map(|r| (r.exit_code, r.output_db, r.output_full, r.duration_seconds))
            }
            TaskType::Script => {
                let script = task
                    .command
                    .as_deref()
                    .map(|c| snapshot.interpolate(c))
                    .unwrap_or_default();
                ssh_executor::execute_script(ssh_session, task, execution_id, &script, channel)
                    .await
                    .map(|r| (r.exit_code, r.output_db, r.output_full, r.duration_seconds))
            }
            TaskType::UploadFile => {
                if let Some(TaskConfig::UploadFile(ref cfg)) = task.config {
                    let resolved = crate::commands::projects::tasks::types::FileTransferConfig {
                        paths: cfg
                            .paths
                            .iter()
                            .map(|p| crate::commands::projects::tasks::types::PathMapping {
                                src: snapshot.interpolate(&p.src),
                                dest: snapshot.interpolate(&p.dest),
                                recursive: p.recursive,
                                exclude: p.exclude.clone(),
                                chmod: p.chmod.clone(),
                            })
                            .collect(),
                        overwrite: cfg.overwrite,
                    };
                    sftp_executor::upload_file(ssh_session, task, execution_id, &resolved, channel)
                        .await
                        .map(|r| (0i64, r.output_db.clone(), r.output_db, r.duration_seconds))
                } else {
                    Err("TaskConfig UploadFile no encontrado en project_tasks.config".to_string())
                }
            }
            TaskType::DownloadFile => {
                if let Some(TaskConfig::DownloadFile(ref cfg)) = task.config {
                    let resolved = crate::commands::projects::tasks::types::FileTransferConfig {
                        paths: cfg
                            .paths
                            .iter()
                            .map(|p| crate::commands::projects::tasks::types::PathMapping {
                                src: snapshot.interpolate(&p.src),
                                dest: snapshot.interpolate(&p.dest),
                                recursive: p.recursive,
                                exclude: p.exclude.clone(),
                                chmod: p.chmod.clone(),
                            })
                            .collect(),
                        overwrite: cfg.overwrite,
                    };
                    sftp_executor::download_file(
                        ssh_session,
                        task,
                        execution_id,
                        &resolved,
                        channel,
                    )
                    .await
                    .map(|r| (0i64, r.output_db.clone(), r.output_db, r.duration_seconds))
                } else {
                    Err("TaskConfig DownloadFile no encontrado en project_tasks.config".to_string())
                }
            }
        };

        match exec_result {
            Ok((exit_code, output_db, output_full, duration_secs)) => {
                let status = if exit_code == 0 {
                    ExecutionStatus::Success
                } else {
                    ExecutionStatus::Failed
                };

                // Log completo en disco
                if let Some(ref lwd) = task.local_working_dir {
                    save_log(lwd, execution_id, &output_full).await;
                }

                update_execution(
                    pool,
                    execution_id,
                    status.clone(),
                    Some(exit_code),
                    Some(output_db),
                    None,
                    duration_secs,
                )
                .await;

                let _ = channel.send(ProgressEvent::TaskFinished {
                    execution_id,
                    task_name: task.task_name.clone(),
                    status,
                    exit_code: Some(exit_code),
                    duration_seconds: duration_secs,
                });

                if exit_code == 0 || attempt + 1 >= max_attempts {
                    return Ok(exit_code);
                }
                // exit_code != 0 con intentos restantes → siguiente vuelta
                last_error = None;
            }
            Err(e) => {
                last_error = Some(e);
                if attempt + 1 >= max_attempts {
                    break;
                }
                // Quedan intentos → continuar el bucle
            }
        }
    }

    Err(last_error.unwrap_or_else(|| "Error desconocido en la ejecución".to_string()))
}

// ============================================================================
// Helpers de base de datos
// ============================================================================

async fn load_deployment(
    pool: &SqlitePool,
    key: &[u8],
    id: i64,
) -> Result<Deployment, String> {
    crud::fetch_one::<Deployment>(pool, id, key)
        .await?
        .ok_or_else(|| format!("Deployment {} no encontrado", id))
}

async fn load_project(
    pool: &SqlitePool,
    key: &[u8],
    project_id: i64,
) -> Result<crate::commands::projects::types::Project, String> {
    use crate::commands::projects::types::Project;
    crud::fetch_one::<Project>(pool, project_id, key)
        .await?
        .ok_or_else(|| format!("Proyecto {} no encontrado", project_id))
}

/// Carga el primer host activo del proyecto por deploy_order.
/// Devuelve también key_content y passphrase del passkey asociado (aún cifrados).
async fn load_project_host(
    pool: &SqlitePool,
    project_id: i64,
) -> Result<(Host, Option<String>, Option<String>), String> {
    use sqlx::Row;

    let row = sqlx::query(
        r#"
        SELECT
            h.id, h.name, h.host, h.port, h.username, h.auth_type,
            h.password, h.key_id, h.description, h.enabled,
            h.created_at, h.updated_at,
            p.key_content,
            p.passphrase
        FROM project_hosts ph
        JOIN hosts h ON ph.host_id = h.id
        LEFT JOIN passkeys p ON h.key_id = p.id
        WHERE ph.project_id = ?1
          AND ph.enabled = 1
          AND h.enabled = 1
        ORDER BY ph.deploy_order ASC
        LIMIT 1
        "#,
    )
    .bind(project_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Error al cargar host del proyecto: {}", e))?
    .ok_or_else(|| {
        format!(
            "No hay ningún host activo configurado para el proyecto {}",
            project_id
        )
    })?;

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
        system_info: row.try_get("system_info").ok().flatten(),
        status_info: row.try_get("status_info").ok().flatten(),
        server_updates: row.try_get("server_updates").ok().flatten(),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    let key_content: Option<String> = row.try_get("key_content").ok().flatten();
    let passphrase: Option<String> = row.try_get("passphrase").ok().flatten();

    Ok((host, key_content, passphrase))
}

/// Carga las project_tasks con su task base, resuelve herencia y construye Vec<ResolvedTask>.
async fn load_resolved_tasks(
    pool: &SqlitePool,
    snapshot: &VariableSnapshot,
    project_id: i64,
) -> Result<Vec<ResolvedTask>, String> {
    use sqlx::Row;

    let rows = sqlx::query(
        r#"
        SELECT
            pt.id           AS project_task_id,
            pt.task_id      AS task_id,
            pt.condition,
            pt.on_failure,
            pt.config,
            pt.local_working_dir  AS pt_local_wd,
            pt.remote_working_dir AS pt_remote_wd,
            pt.retry_count        AS pt_retry_count,
            pt.retry_delay        AS pt_retry_delay,
            t.name,
            t.type                AS task_type,
            t.command,
            t.timeout,
            t.retry_count         AS t_retry_count,
            t.retry_delay         AS t_retry_delay
        FROM project_tasks pt
        JOIN tasks t ON pt.task_id = t.id
        WHERE pt.project_id = ?1
          AND pt.enabled = 1
          AND t.enabled = 1
        ORDER BY pt.order_execution ASC
        "#,
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error al cargar project_tasks: {}", e))?;

    let mut tasks = Vec::new();

    for row in rows {
        let project_task_id: i64 = row.get("project_task_id");
        let task_id: i64 = row.get("task_id");
        let task_name: String = row.get("name");

        let task_type_str: String = row.get("task_type");
        let task_type: TaskType = task_type_str
            .parse()
            .map_err(|e| format!("TaskType inválido en task '{}': {}", task_name, e))?;

        let command: Option<String> = row.get("command");
        let command = command.map(|c| snapshot.interpolate(&c));

        let on_failure_str: String = row.get("on_failure");
        let on_failure = match on_failure_str.as_str() {
            "continue" => OnFailure::Continue,
            "retry" => OnFailure::Retry,
            _ => OnFailure::Stop,
        };

        let condition: Option<String> = row.get("condition");

        let config: Option<sqlx::types::Json<TaskConfig>> = row.try_get("config").ok().flatten();
        let config = config.map(|j| j.0);

        // Resolución de working_dir: project_task > proyecto (desde snapshot)
        let pt_local_wd: Option<String> = row.get("pt_local_wd");
        let pt_remote_wd: Option<String> = row.get("pt_remote_wd");
        let local_working_dir =
            pt_local_wd.or_else(|| snapshot.vars.get("local_working_dir").cloned());
        let remote_working_dir =
            pt_remote_wd.or_else(|| snapshot.vars.get("remote_working_dir").cloned());

        // Resolución de retry: project_task > task base
        let t_retry_count: i64 = row.get("t_retry_count");
        let t_retry_delay: i64 = row.get("t_retry_delay");
        let pt_retry_count: Option<i64> = row.get("pt_retry_count");
        let pt_retry_delay: Option<i64> = row.get("pt_retry_delay");
        let retry_count = pt_retry_count.unwrap_or(t_retry_count) as u32;
        let retry_delay = pt_retry_delay.unwrap_or(t_retry_delay) as u32;

        let timeout: i64 = row.get("timeout");

        tasks.push(ResolvedTask {
            project_task_id,
            task_id,
            task_name,
            task_type,
            command,
            config,
            local_working_dir,
            remote_working_dir,
            timeout,
            retry_count,
            retry_delay,
            on_failure,
            condition,
        });
    }

    Ok(tasks)
}

async fn count_non_success_executions(
    pool: &SqlitePool,
    deployment_id: i64,
) -> Result<u32, String> {
    use sqlx::Row;
    let row = sqlx::query(
        "SELECT COUNT(*) as cnt FROM deployment_executions \
         WHERE deployment_id = ?1 AND status != 'success'",
    )
    .bind(deployment_id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Error al contar executions no completadas: {}", e))?;

    Ok(row.get::<i64, _>("cnt") as u32)
}

async fn is_execution_success(pool: &SqlitePool, execution_id: i64) -> Result<bool, String> {
    use sqlx::Row;
    let row = sqlx::query("SELECT status FROM deployment_executions WHERE id = ?1")
        .bind(execution_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error al verificar estado de execution: {}", e))?;

    Ok(row.map(|r| r.get::<String, _>("status") == "success").unwrap_or(false))
}

async fn get_or_create_execution(
    pool: &SqlitePool,
    key: &[u8],
    deployment_id: i64,
    host_id: i64,
    task: &ResolvedTask,
) -> Result<i64, String> {
    use sqlx::Row;

    // Buscar execution existente para esta combinación deployment + task + host
    let row = sqlx::query(
        "SELECT id FROM deployment_executions \
         WHERE deployment_id = ?1 AND task_id = ?2 AND host_id = ?3 LIMIT 1",
    )
    .bind(deployment_id)
    .bind(task.project_task_id)
    .bind(host_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Error al buscar execution existente: {}", e))?;

    if let Some(r) = row {
        return Ok(r.get::<i64, _>("id"));
    }

    // Crear nueva execution en estado Pending
    let execution = DeploymentExecution {
        id: 0,
        deployment_id,
        host_id,
        task_id: task.project_task_id,
        status: ExecutionStatus::Pending,
        exit_code: None,
        output: None,
        error_message: None,
        started_at: None,
        finished_at: None,
        duration_seconds: None,
        retry_attempt: 0,
        created_at: String::new(),
    };

    crud::insert::<DeploymentExecution>(pool, &execution, key)
        .await
        .map_err(|e| format!("Error al crear execution: {}", e))
}

async fn update_execution_started(pool: &SqlitePool, execution_id: i64, attempt: u32) {
    let now = chrono::Utc::now().to_rfc3339();
    let _ = sqlx::query(
        "UPDATE deployment_executions \
         SET status = 'running', started_at = ?1, retry_attempt = ?2 \
         WHERE id = ?3",
    )
    .bind(&now)
    .bind(attempt as i64)
    .bind(execution_id)
    .execute(pool)
    .await;
}

async fn update_execution(
    pool: &SqlitePool,
    execution_id: i64,
    status: ExecutionStatus,
    exit_code: Option<i64>,
    output: Option<String>,
    error_message: Option<String>,
    duration_seconds: i64,
) {
    let now = chrono::Utc::now().to_rfc3339();
    let status_str = match status {
        ExecutionStatus::Success => "success",
        ExecutionStatus::Failed => "failed",
        ExecutionStatus::Running => "running",
        ExecutionStatus::Skipped => "skipped",
        ExecutionStatus::Pending => "pending",
    };

    let _ = sqlx::query(
        r#"UPDATE deployment_executions
           SET status = ?1, exit_code = ?2, output = ?3, error_message = ?4,
               finished_at = ?5, duration_seconds = ?6
           WHERE id = ?7"#,
    )
    .bind(status_str)
    .bind(exit_code)
    .bind(output)
    .bind(error_message)
    .bind(&now)
    .bind(duration_seconds)
    .bind(execution_id)
    .execute(pool)
    .await;
}

async fn update_deployment_status(
    pool: &SqlitePool,
    deployment_id: i64,
    status: DeploymentStatus,
    started_at: Option<String>,
    finished_at: Option<String>,
    duration_seconds: Option<i64>,
) -> Result<(), String> {
    let status_str = match status {
        DeploymentStatus::Pending => "pending",
        DeploymentStatus::Running => "running",
        DeploymentStatus::Success => "success",
        DeploymentStatus::Failed => "failed",
    };

    sqlx::query(
        r#"UPDATE deployments
           SET status = ?1,
               started_at       = COALESCE(?2, started_at),
               finished_at      = COALESCE(?3, finished_at),
               duration_seconds = COALESCE(?4, duration_seconds)
           WHERE id = ?5"#,
    )
    .bind(status_str)
    .bind(started_at)
    .bind(finished_at)
    .bind(duration_seconds)
    .bind(deployment_id)
    .execute(pool)
    .await
    .map_err(|e| format!("Error al actualizar estado del deployment: {}", e))?;

    Ok(())
}

/// Crea o recupera una execution y la marca como Skipped.
async fn skip_task(
    pool: &SqlitePool,
    key: &[u8],
    deployment_id: i64,
    host_id: i64,
    task: &ResolvedTask,
    _order: u32,
    reason: &str,
    channel: &Channel<ProgressEvent>,
) {
    if let Ok(execution_id) =
        get_or_create_execution(pool, key, deployment_id, host_id, task).await
    {
        update_execution(
            pool,
            execution_id,
            ExecutionStatus::Skipped,
            None,
            None,
            Some(reason.to_string()),
            0,
        )
        .await;

        let _ = channel.send(ProgressEvent::TaskSkipped {
            execution_id,
            task_name: task.task_name.clone(),
            reason: reason.to_string(),
        });
    }
}

/// Guarda el output completo en disco.
/// Ruta: {local_working_dir}/.deployer/logs/execution_{id}.log
async fn save_log(local_working_dir: &str, execution_id: i64, output: &str) {
    use std::path::PathBuf;

    let log_path = PathBuf::from(local_working_dir)
        .join(".deployer")
        .join("logs")
        .join(format!("execution_{}.log", execution_id));

    if let Some(parent) = log_path.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }

    let _ = tokio::fs::write(&log_path, output).await;
}
