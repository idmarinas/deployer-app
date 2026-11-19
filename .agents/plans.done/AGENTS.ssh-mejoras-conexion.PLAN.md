# Plan: Mejoras futuras de SSH (1/4) — Triple timeout y verificación de la clave del servidor

## Estado

**Terminado** — el usuario confirmó la verificación y dio el plan por completado el 2026-11-19.

**Diseño de origen:** `.agents/designs/AGENTS.unificar-ssh-remote.DESIGN.md`. Corresponde a las mejoras 5 y 6 de la sección §10 del diseño.

**Serie:** ssh-mejoras — plan 1 de 4. Hermanos: `AGENTS.ssh-mejoras-conexion.PLAN.md`, `AGENTS.ssh-mejoras-ejecucion.PLAN.md`, `AGENTS.ssh-mejoras-transferencias.PLAN.md`, `AGENTS.ssh-mejoras-duplicaciones.PLAN.md`.

**Dependencia:** ninguna.

**Orden de ejecución:** 1 de 4. Fija la capa de conexión y la política de clave sobre la que trabajan los demás planes de la serie.

---

## Instrucciones dadas (verbatim)

    > "Crea el plan para eso que quedó pendiente del diseño."

    Contexto aportado por el agente (análisis previo):

    - El usuario eligió **«Varios planes por bloque»**; este es el bloque de **conexión y seguridad**.
    - §10 advierte: *«Futuras fases (no incluidas; requieren aprobación explícita porque cambiarían el comportamiento)»*. La política de confianza de la clave del servidor no está definida y queda como punto abierto.
    - Código verificado: `ssh/connect.rs:11` define `SSH_TIMEOUT_SECS = 15` y lo aplica en `:39-45`; `ssh/session.rs:12` define `CONNECT_TIMEOUT_SECS = 15` y lo aplica en `:168-169` a `client::connect`; `commands/hosts/test_connection.rs:10` define `CONNECTION_TIMEOUT_SECS = 10` y lo aplica en `:26-30`. Los tres timeouts están anidados.
    - `ssh/session.rs:20-25`: `check_server_key` devuelve `Ok(true)` sin inspeccionar `_server_public_key`; hoy se acepta cualquier clave del servidor.
    - `export_public_key` llama directamente a helpers de `ssh/` sin pasar por `connect_to_host_by_id`; cualquier cambio de firma debe revisar también ese consumidor.
    - Notas añadidas por Iván al plan el 2026-11-19:
    > «Nota Iván: unificalo, y también las claves de localización, a unas que sean tauri.ssh.* para unificarlas dentro del mismo módulo.»
    >
    > «Nota Iván: unificar esto, ssh, tiene que gestionar las conexiones que necesitan otros comandos.»

---

## Objetivo

Hacer de `ssh/` el único módulo que gestiona las conexiones (incluidas las que necesitan otros comandos), unificar los tres timeouts anidados y sus claves i18n bajo `tauri.ssh.*`, y sustituir la aceptación ciega de la clave del servidor por una verificación contra una **huella guardada por host** en la BD, confirmada por el usuario al dar de alta o editar el host.

**No entra en este plan:** el timeout de ejecución de comandos (otro plan), las transferencias (otro plan) ni la consolidación de duplicaciones (otro plan). El cambio del modelo de datos (`deployer_hosts`), el renombrado de claves i18n y la centralización de conexiones en `ssh/` ya están aprobados por el usuario y entran aquí. No se ejecuta nada hasta que el usuario lo pase a **Pendiente**.

---

## Contexto técnico actual

    - `connect_to_host_by_id(app, host_id, reconnect_attempts, enabled_only)` abre pool y vault, consulta credenciales, descifra y envuelve `SshSession::connect` en un `timeout` de 15 s.
    - `SshSession::connect` envuelve `client::connect` en otro `timeout` de 15 s y configura `russh::client::Config::default()`.
    - `test_connection` envuelve toda la llamada anterior en un `timeout` de 10 s, de modo que el plazo externo puede dispararse antes que los internos y produce `tauri.hosts.errors.connection_timeout`.
    - `check_server_key` acepta cualquier clave, sin `known_hosts` ni huella configurada. No hay campo en `deployer_hosts` para guardar una huella (verificado en el SELECT de `fetch_host_credentials`).
    - La decisión adoptada añade esa huella a `deployer_hosts`, con lo que hace falta una migración SQL según las reglas del proyecto: editar la migración en `drizzle/migrations/`, ejecutar `bun run drizzle:generate` (generate + flatten) y no tocar `src/drizzle/schema.ts` a mano.
    - Las claves i18n de SSH están repartidas entre `tauri.hosts.*`, `tauri.remote.*` y `tauri.passkeys.*`. Además, `test_connection.rs` usa `tauri.hosts.errors.connection_failed` y `tauri.hosts.errors.connection_timeout`, que **no existen** en `src/locales/{es,en}/tauri.ts` (solo están las variantes en singular `tauri.hosts.error.*`). Unificar bajo `tauri.ssh.*` corrige esa discrepancia.
    - `export_public_key` abre su propio pool en modo solo lectura, descifra credenciales y llama directamente a `SshSession::connect` (`commands/passkeys/export_public_key.rs:215-242`); es el único comando que elude `connect_to_host_by_id`, de modo que cualquier política de timeout o huella que se añada solo en `ssh/connect.rs` no le afectaría.

    **Claves i18n a unificar (propuesta de `tauri.ssh.*`):**

    | Clave actual | Clave nueva |
    | --- | --- |
    | `tauri.hosts.error.connection_failed` | `tauri.ssh.errors.connection_failed` |
    | `tauri.hosts.errors.connection_failed` | `tauri.ssh.errors.connection_failed` |
    | `tauri.hosts.error.connection_timeout` | `tauri.ssh.errors.connection_timeout` |
    | `tauri.hosts.errors.connection_timeout` | `tauri.ssh.errors.connection_timeout` |
    | `tauri.hosts.success.connection` | `tauri.ssh.success.connection` |
    | `tauri.remote.errors.cancelled` | `tauri.ssh.errors.cancelled` |
    | `tauri.remote.errors.connection_failed` | `tauri.ssh.errors.connection_failed` |
    | `tauri.remote.errors.execution_failed` | `tauri.ssh.errors.execution_failed` |
    | `tauri.remote.errors.transfer_failed` | `tauri.ssh.errors.transfer_failed` |
    | `tauri.remote.success.exec` | `tauri.ssh.success.exec` |
    | `tauri.remote.success.upload` | `tauri.ssh.success.upload` |
    | `tauri.remote.success.download` | `tauri.ssh.success.download` |
    | `tauri.remote.exec.completed_with_errors` | `tauri.ssh.exec.completed_with_errors` |
    | `tauri.passkeys.error.authorized_keys_not_found` | `tauri.ssh.errors.authorized_keys_not_found` |
    | `tauri.passkeys.error.public_key_not_in_authorized_keys` | `tauri.ssh.errors.public_key_not_in_authorized_keys` |
    | (nueva) | `tauri.ssh.errors.host_key_mismatch` |
    | (nueva) | `tauri.ssh.errors.host_key_unknown` |

    Quedan fuera de este traslado las claves de base de datos/contexto (`tauri.hosts.error.context_failed`, `database_error`, `no_database_path`, `store_error`, `not_found`) y las de datos de passkey (`tauri.passkeys.error.not_found`, `public_key_failed`): no describen conexión SSH. Las dos claves de `authorized_keys` de `export_public_key` se incluyen en `tauri.ssh.errors.*` porque son errores de la operación remota; se confirmará este alcance antes de ejecutar.

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-19 | El usuario pide planes separados por bloque; este agrupa las mejoras 5 y 6 de §10. |
| 2026-11-19 | Iván elige la política de **huella por host guardada en BD**: columna nueva en `deployer_hosts`, mostrada/confirmada al dar de alta o editar el host; `check_server_key` compara contra ese valor. Acepta también la migración que ello implica. |
| 2026-11-19 | Iván pide que se unifiquen también las claves de localización bajo `tauri.ssh.*`, dentro del mismo módulo. |
| 2026-11-19 | Iván pide que `ssh/` gestione las conexiones que necesitan otros comandos: `export_public_key` deja de conectar por su cuenta y pasa por el módulo `ssh/`. |
| 2026-11-19 | Iván autoriza la implementación y pasa el plan a **Ejecutando**. |
| 2026-11-19 | **Timeout único:** `SSH_CONNECT_TIMEOUT_SECS = 15` en `ssh/session.rs`; sin `timeout` externos en `connect.rs` ni en `test_connection.rs`. |
| 2026-11-19 | **Capa de error:** `ssh/` reporta todas las claves `tauri.ssh.*`; los comandos solo reenvían `CommandResponse`. |
| 2026-11-19 | **Huella:** formato `SHA256:<base64>`; si cambia, se rechaza y exige reconfirmación manual desde la edición del host. |
| 2026-11-19 | **Alcance i18n confirmado:** se incluyen las dos claves de `authorized_keys` en `tauri.ssh.errors.*`; siguen en su módulo las de BD/contexto y datos de passkey. |

**Alternativas descartadas:** dejar los tres timeouts anidados (el externo gana siempre y los internos son engañosos); `known_hosts` del usuario (depende de un archivo externo y obliga a mantener entradas por IP); TOFU sin confirmación (acepta la primera clave de forma automática); mantener `Ok(true)` (no resuelve la mejora 6). La huella en BD con confirmación explícita es la opción elegida porque identifica al host y avisa también si una misma IP pasa a otra máquina.

---

## Problemas y riesgos encontrados

### P1 — Timeouts anidados contradictorios y claves i18n dispersas

    - `test_connection` da 10 s, pero `connect_to_host_by_id` y `session.rs` dan 15 s. El mensaje de timeout puede venir de capas distintas con distintas claves i18n.
    - Iván pide unificar el timeout **y** las claves de localización bajo `tauri.ssh.*` (nota recogida en este punto).
    - Las claves están hoy en `tauri.hosts.*`, `tauri.remote.*` y `tauri.passkeys.*`; dos de las que usa `test_connection` ni siquiera existen en los locales. El frontend referencia directamente `tauri.remote.exec.completed_with_errors` en `src/components/remote/RemoteCommand.vue:57`.
    - **→ Riesgo MEDIO.** Definir una única fuente de verdad del plazo y una única familia `tauri.ssh.*`. Aplicar la tabla de equivalencias de «Contexto técnico actual» en Rust, locales es/en y las referencias del frontend; regenerar `typed-locale.d.ts` (`bun run i18n:types`) y verificar que no queda ninguna clave antigua en los módulos SSH.

### P2 — Política de clave del servidor (decidida: huella por host en BD)

    **Contexto ampliado a petición de Iván (2026-11-19):**

- **Comportamiento actual.** `ssh/session.rs:14-26` define `SshClientHandler` como una unidad struct sin estado y `check_server_key` devuelve `Ok(true)` sin mirar `_server_public_key`. `connect_and_auth` (`session.rs:161-176`) crea un handler nuevo en cada conexión con `client::Config::default()`: no hay `known_hosts`, no se calcula huella y no se compara con nada. La librería russh verifica la firma del intercambio de claves **antes** de llamar al callback, pero delega en la aplicación la decisión de confiar; su implementación por defecto rechazaría todas las claves, y nuestro override acepta todas (riesgo de MITM).
- **Qué llega al callback.** `check_server_key` recibe `&russh::keys::PublicKeyOrCertificate`; expone `public_key()` y `certificate()`. Desde ahí se puede obtener la clave OpenSSH (`to_openssh`) o la huella SHA256 (`fingerprint()`), sin dependencias nuevas.
- **Estado de los datos.** `deployer_hosts` no tiene columna de huella ni de clave del servidor: `src/drizzle/entities/hosts.ts:8-38` solo guarda `host`, `port`, `username`, `auth_type`, `password`, `key_id`, `system_info`, `status_info`, `server_updates` y timestamps. La consulta `fetch_host_credentials` (`ssh/connect.rs:57-91`) tampoco selecciona nada similar. `passkeys.fingerprint` sí existe, pero identifica la **clave privada del cliente**, no la clave host del servidor: no es reutilizable aquí.
- **Ayuda disponible en la dependencia actual.** `russh = "0.65.1"` (resuelto a 0.65.2 en `Cargo.lock`) ya reexporta `keys::check_known_hosts(host, port, pubkey)` y `keys::check_known_hosts_path(host, port, pubkey, path)`. No haría falta añadir crate. El primer caso usa la ubicación estándar de `known_hosts`; el segundo permite un archivo controlado por la app.
- **Alcance del cambio.** El handler no sabe a qué host está conectando: para comparar contra una huella guardada habría que darle estado (`host`, `port`, huella esperada) y pasarlo desde `SshSession::connect`. Afecta también a `ensure_connected` (`session.rs:73-105`, reconexión) y a `export_public_key` (`commands/passkeys/export_public_key.rs:215-242`), que llama a `SshSession::connect` directamente con credenciales temporales o de BD y podría saltarse la verificación si solo se hiciera en `connect_to_host_by_id`.
- **Opciones valoradas** (Iván eligió la número 2 el 2026-11-19):
    1. `known_hosts` estándar de russh: sin BD ni UI, pero depende de que el usuario tenga el archivo poblado; la primera conexión a un host nuevo fallaría salvo que se implemente alta automática. **Descartada.**
    2. **Huella por host en BD** (columna nueva en `deployer_hosts`) + mostrar/confirmar la huella al dar de alta o editar el host. **Elegida.**
    3. *Trust on first use* (TOFU): aceptar la primera clave, guardarla y rechazar cambios después; cómodo, pero hay que decidir quién confirma la primera conexión y dónde se guarda. **Descartada** al exigir confirmación explícita.
    4. Mantener `Ok(true)`: descartado, sería dejar sin aplicar la mejora 6 de §10.
- **Decisión adoptada:** verificar siempre contra la huella guardada en el host. Flujo previsto:
    1. `SshClientHandler` deja de ser una unidad struct: recibe la huella esperada y un lugar donde dejar constancia de la clave que presenta el servidor (por ejemplo `Arc<Mutex<Option<String>>>`), para que `connect_and_auth` pueda devolverla al llamador.
    2. Si el host **ya tiene huella guardada**, `check_server_key` compara la clave presentada y devuelve `false` si no coincide; el error llega con una clave i18n nueva.
    3. Si el host **no tiene huella**, la conexión no se considera de confiar: se captura la huella vista y se devuelve al frontend (en la respuesta de `test_connection` o en un comando dedicado) para que el usuario la vea y confirme; solo entonces se guarda con Drizzle.
    4. La misma verificación se aplica en `ensure_connected` (reconexión) y en `export_public_key` (que conecta directamente con credenciales temporales o de BD).
    5. Con IP, la huella se asocia al registro del host, no a un nombre DNS: detecta tanto suplantación en la red como el cambio de máquina tras la misma IP.
- **Detalles a fijar en Fase 1** (no cambian la política): formato exacto de la huella (p. ej. `SHA256:...` y si se incluye el algoritmo) y si un cambio legítimo de clave del servidor obliga a reconfirmar manualmente.

- **→ Riesgo ALTO.** La migración es obligatoria con la opción elegida: editar SQL en `drizzle/migrations/`, ejecutar `bun run drizzle:generate`, no tocar `src/drizzle/schema.ts`, y registrar aquí el nombre de la migración al ejecutar.

### P3 — Conexiones abiertas fuera del módulo `ssh/`

    - `commands/passkeys/export_public_key.rs` usa `open_command_channel`, `SshSession` y credenciales directamente; no pasa por `connect_to_host_by_id`. Iván pide unificarlo: `ssh/` tiene que gestionar las conexiones que necesitan otros comandos (nota recogida en este punto).
    - Hoy `export_public_key` además abre su propio pool de solo lectura y descifra credenciales por su cuenta, duplicando el pipeline de `ssh/connect.rs`.
    - **→ Riesgo ALTO.** Si la verificación de huella y el timeout se implementan solo en `connect_to_host_by_id`, este comando seguirá eludiendo ambas. Unificar el punto de conexión: ampliar `ssh/connect.rs` con un helper que acepte un host y unas credenciales opcionales de sustitución (para las credenciales temporales de `export_public_key`) y hacer que **todos** los comandos (los cuatro de `ssh/`, `test_connection` y `export_public_key`) pasen por él. Ningún comando fuera de `ssh/` debe llamar a `SshSession::connect` ni a `connect_and_auth` directamente.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — Fijar decisiones

1. Política de clave ya decidida (huella en BD, confirmada por el usuario). Fijar el formato exacto de la huella y el comportamiento ante un cambio de clave del servidor.
2. Decidir si los timeouts se unifican en una sola constante, se parametrizan por llamador o se eliminan los `timeout` internos, y qué capa reporta el error.
3. Confirmar el alcance del renombrado de claves (tabla de «Contexto técnico actual») y la firma del helper de conexión que sustituirá al `SshSession::connect` directo de `export_public_key`.
4. Anotar las decisiones en la tabla «Decisiones» antes de tocar código.

### Fase 2 — Unificar timeouts y claves `tauri.ssh.*`

1. Ajustar `ssh/connect.rs`, `ssh/session.rs` y `commands/hosts/test_connection.rs` según lo decidido, con una sola fuente de verdad del plazo y una sola capa que reporta el error.
2. Aplicar la tabla de equivalencias: mover las claves de conexión, ejecución, transferencia, cancelación y operación remota a `tauri.ssh.*` en `src/locales/es/tauri.ts` y `src/locales/en/tauri.ts`, incluidas las claves nuevas de huella.
3. Actualizar todos los emisores Rust (`ssh/exec.rs`, `ssh/transfer_commands.rs`, `commands/hosts/test_connection.rs`, `commands/passkeys/export_public_key.rs`) y la referencia directa del frontend en `src/components/remote/RemoteCommand.vue:57`.
4. Ejecutar `bun run i18n:types` (paso manual) y comprobar que no quedan referencias a las claves antiguas en los módulos SSH.

### Fase 3 — Centralizar en `ssh/` las conexiones de otros comandos

1. Ampliar `ssh/connect.rs` con un helper único de conexión que acepte el ID del host y unas credenciales opcionales de sustitución (para las credenciales temporales de `export_public_key`), manteniendo `connect_to_host_by_id` como caso sin sustitución.
2. Hacer que `test_connection`, los cuatro comandos de `ssh/` y `export_public_key` usen ese helper; `export_public_key` elimina su apertura de pool y su descifrado de credenciales de host, conservando solo la lectura de la passkey y la operación sobre `authorized_keys`.
3. Eliminar los llamados directos a `SshSession::connect` y `fetch_host_credentials` fuera de `ssh/` (reexportar desde `ssh/` solo lo que siga siendo necesario).
4. Comprobar que conexión, reconexión, exportación de clave y verificación de huella pasan por el mismo punto.

### Fase 4 — Verificación de la clave del servidor

1. Crear la migración de `deployer_hosts` siguiendo `AGENTS.md` (editar SQL en `drizzle/migrations/`, `bun run drizzle:generate`, no tocar `src/drizzle/schema.ts`) y añadir la columna a `src/drizzle/entities/hosts.ts`.
2. Dar estado a `SshClientHandler` y capturar/devolver la huella vista desde `connect_and_auth` (`ssh/session.rs`); `check_server_key` compara contra la huella esperada.
3. Pasar la huella del registro desde el helper único de `ssh/connect.rs` y devolver la huella vista cuando el host aún no la tiene guardada (vía `test_connection` o comando dedicado).
4. Mostrar y confirmar la huella en el alta/edición de hosts (`src/pages/dashboard/hosts/`) y guardarla con Drizzle en `src/composables/queries/hosts.ts`.
5. Regenerar `tauri-types.d.ts` si cambian los tipos (paso manual).
6. Comprobar que la verificación se aplica también en `ensure_connected` (reconexión) y en `export_public_key` gracias a la centralización de la Fase 3.

### Fase 5 — Documentación

1. Actualizar `AGENTS.backend.md` con los timeouts, la familia `tauri.ssh.*`, el helper único de conexión y la política de clave.
2. Actualizar `AGENTS.frontend.md` y la documentación de usuario de hosts con la confirmación de huella y el cambio de claves i18n.
3. Registrar en §10 del diseño que ambas mejoras y las dos notas de Iván quedan reflejadas en este plan.

---

## Archivos afectados

    | Archivo | Cambio previsto |
    | --- | --- |
    | `src-tauri/src/ssh/connect.rs` | Timeout resultante, helper único de conexión, paso de la huella esperada. |
    | `src-tauri/src/ssh/session.rs` | `CONNECT_TIMEOUT_SECS`, handler con estado, captura/comparación de la huella. |
    | `src-tauri/src/ssh/mod.rs` | Reexportar el helper único de conexión; retirar reexports que dejen de usarse. |
    | `src-tauri/src/ssh/exec.rs` | Claves `tauri.ssh.*` y uso del helper único. |
    | `src-tauri/src/ssh/transfer_commands.rs` | Claves `tauri.ssh.*` y uso del helper único. |
    | `src-tauri/src/commands/hosts/test_connection.rs` | Timeout externo, clave `tauri.ssh.*` y huella vista cuando aún no está guardada. |
    | `src-tauri/src/commands/passkeys/export_public_key.rs` | Conectar solo vía `ssh/`; claves `tauri.ssh.*`. |
    | `src/drizzle/entities/hosts.ts` | Columna nueva de huella (no es archivo autogenerado). |
    | `drizzle/migrations/` + `src-tauri/migrations/` | Migración de la columna nueva (flujo estándar de migraciones). |
    | `src/composables/queries/hosts.ts` | Persistir la huella confirmada con Drizzle. |
    | `src/pages/dashboard/hosts/add.vue` / `[id]/edit.vue` / `[id]/(view).vue` | Mostrar y confirmar la huella en alta, edición y vista. |
    | `src/components/remote/RemoteCommand.vue` | Referencia a `tauri.ssh.exec.completed_with_errors`. |
    | `src/types/tauri-types.d.ts` | Regenerado; no editar a mano. |
    | `src/locales/es/tauri.ts` / `src/locales/en/tauri.ts` | Nueva familia `tauri.ssh.*`, claves de huella y retirada de las antiguas. |
    | `typed-locale.d.ts` | Regenerado con `bun run i18n:types`; no editar a mano. |
    | `AGENTS.backend.md` / `AGENTS.frontend.md` | Timeouts, claves `tauri.ssh.*`, helper de conexión y política de clave. |
    | `docs/content/es/004.hosts/` | Alta de hosts con confirmación de huella. |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa.

1. `test_connection` con un host normal y con un host deshabilitado (`enabled_only: false`).
2. Conexión a un host lento o inalcanzable: comprobar qué capa reporta el timeout y qué mensaje ve el usuario.
3. Ejecución de un comando y exportación de clave pública: comprobar que la verificación de huella no rompe los flujos existentes.
4. Alta de un host sin huella: se muestra la huella vista, se confirma y se guarda; la conexión posterior debe funcionar.
5. Cambiar la clave del servidor (o apuntar la misma IP a otra máquina): debe fallar con el mensaje de discrepancia.
6. Reconexión automática y exportación de clave: ambas aplican la misma verificación y el mismo timeout.
7. Comandos SSH y `test_connection`: los mensajes salen con claves `tauri.ssh.*` y se muestran correctamente en español e inglés.
8. Comprobar que no hay llamadas a `SshSession::connect` ni a `connect_and_auth` fuera de `ssh/` y que exportar clave sigue funcionando con credenciales temporales y con las guardadas.

---

## Criterios de aceptación

    - [ ] Queda una sola fuente de verdad para el plazo de conexión o está claramente documentada la jerarquía.
    - [ ] Todas las claves i18n de conexión/ejecución/transferencia/operación remota están bajo `tauri.ssh.*` en Rust, locales y frontend; no quedan referencias a las antiguas en los módulos SSH.
    - [ ] Ningún comando fuera de `ssh/` abre conexiones SSH por su cuenta: todos pasan por el helper único de `ssh/connect.rs`.
    - [ ] La huella se guarda por host en `deployer_hosts` y se confirma desde el formulario de hosts.
    - [ ] `check_server_key` compara contra la huella guardada, captura la vista cuando no hay y ya no acepta cualquier clave sin más.
    - [ ] Un cambio de clave del servidor se rechaza con clave i18n nueva; la verificación alcanza a reconexiones y `export_public_key`.
    - [ ] `test_connection`, `ssh_execute_command` y `export_public_key` siguen funcionando.
    - [ ] La migración se generó con `bun run drizzle:generate` y no se editaron archivos autogenerados.
    - [ ] Locales y documentación actualizados.

### Desviaciones

    - Se añadió `src-tauri/src/ssh/error.rs` (no figuraba en la tabla de archivos) para concentrar `SshError`, `keys::*` y `err_response`; es la materialización de la decisión de que `ssh/` reporte los errores.
    - El alta no puede mostrar la huella antes de guardar porque `test_connection` necesita el ID del host: se guarda el host y se ofrece confirmar la huella inmediatamente después; la edición permite repetir la comprobación y reconfirmar cambios.
    - La persistencia de la huella y el diálogo de confirmación viven en un composable nuevo, `src/composables/dashboard/hosts/useHostFingerprint.ts`, en vez de en `src/composables/queries/hosts.ts` como decía el plan: así el alta, la edición y el toolbar comparten la misma lógica sin acoplarla al CRUD.
    - La migración se generó con `bun run drizzle:generate --name host_key_fingerprint` (16:11:2026, `20261119131612_host_key_fingerprint`); se aplanó automáticamente a `src-tauri/migrations/`.
    - No se regeneraron `typed-locale.d.ts` ni `tauri-types.d.ts` durante la ejecución: quedan para la verificación manual del usuario (`bun run i18n:types`). No se ejecutaron `cargo check`, `vue-tsc` ni `bun run build`.

---

## Puntos abiertos

Ninguno. Los cuatro puntos se resolvieron el 2026-11-19 al autorizar la ejecución (tabla «Decisiones»): timeout único de 15 s, errores reportados por `ssh/`, huella `SHA256:<base64>` con reconfirmación manual y alcance i18n con `authorized_keys`.

---

## Historial

    | Fecha | Cambio |
    | --- | --- |
    | 2026-11-19 | Plan creado en estado **Planificando** a partir de §10 del diseño, según la agrupación elegida por el usuario. |
    | 2026-11-19 | Atendida la nota de Iván en P2: ampliado el contexto técnico y enumeradas las opciones de política de clave del servidor. |
    | 2026-11-19 | Iván elige «huella por host en BD»: se actualizan Objetivo, Decisiones, P2, fases, archivos, verificación y criterios de aceptación. |
    | 2026-11-19 | Iván autoriza la ejecución; el plan pasa a **Ejecutando** y se fijan timeout único, capa de error, formato de huella y alcance i18n. |
    | 2026-11-19 | Implementadas las fases 2-4: errores `SshError`/`tauri.ssh.*`, helper único de conexión, verificación de huella, migración `20261119131612_host_key_fingerprint` y UI de confirmación. |
    | 2026-11-19 | Actualizadas `AGENTS.backend.md`, `AGENTS.frontend.md`, `docs/content/es/004.hosts/` y §10 del diseño; pendiente la verificación manual del usuario. |
    | 2026-11-19 | El usuario ejecutó `cargo check` y reportó tres `unused_imports` en `ssh/mod.rs`; retirados los reexports de `err_response`, `HostCredentials` y `SshCredentials` (sus consumidores usan las rutas directas `ssh::error::` y `super::session::`). |
    | 2026-11-19 | El usuario confirmó la verificación («Todo ok.») y dio el plan por terminado; archivado en `.agents/plans.done/` y eliminado de `AGENTS.todo.md`. La serie sigue con los planes 2/4, 3/4 y 4/4 en **Planificando**. |
