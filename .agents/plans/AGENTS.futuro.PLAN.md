# Plan global de trabajo futuro (backlog)

> **Estado: backlog vivo. No ejecutar desde aquí.**
>
> Este es el **único destino** de todo lo que se aplaza: ideas, mejoras, deuda técnica y
> funcionalidades futuras. Desde aquí se **extraen bloques** a planes dedicados cuando se
> vayan a implementar.
>
> Regla de uso:
>
> 1. Un bloque pendiente se registra aquí con un ID (`FUT-*`).
> 2. Al iniciar su implementación, se extrae a `.agents/plans/AGENTS.<tema>.PLAN.md` y aquí se marca
>    `Extraído → <archivo>`.
> 3. Al terminar, el plan dedicado se mueve a `.agents/plans.done/` y aquí se marca `Hecho` o `Descartado`.
> 4. No se implementa nada listado aquí sin un plan aprobado.
>
> Este documento **no sustituye** a `AGENTS.todo.md` ni a los planes activos: los indexa y
> centraliza lo que aún no tiene plan.

## Prioridades

| Valor | Significado |
| --- | --- |
| **Alta** | Desbloquea otras áreas o hay riesgo real si se deja pasar |
| **Media** | Mejora clara, sin urgencia inmediata |
| **Baja** | Nice-to-have o depende de que crezca el uso |
| **Muy baja** | Solo si el producto lo justifica |

---

## 1. Registro de bloques

| ID | Bloque | Área | Prioridad | Depende de | Estado | Detalle |
| --- | --- | --- | --- | --- | --- | --- |
| FUT-VAR-02 | Renombrado explícito de `slug` con búsqueda de referencias | Variables | Baja | [Soft-delete (terminado)](../plans.done/AGENTS.soft-delete.PLAN.md) | Pendiente | §2.1 |
| FUT-VAR-03 | `internal` / `custom` para variables sembradas | Variables / Seed | Baja | Seed de variables (no planificado) | Pendiente | §2.2 |
| FUT-VAR-04 | `group` / tags del catálogo | Variables / UI | Muy baja | — | Pendiente | §2.3 |
| FUT-VAR-05 | Desclasificación explícita de variables secretas | Variables / Cifrado | Baja | — | Pendiente | §2.4 |
| FUT-VAR-06 | Endurecer `is_encrypted()` en Rust | Cifrado / Rust | Media | — | Pendiente | §2.5 |
| FUT-VAR-07 | Auditoría de datos cifrados existentes | Cifrado / BD | Media | — | Pendiente | §2.6 |
| FUT-VAR-08 | Consolidar centinelas `BLANK_VALUE` / `ENC_PREFIX` | Cifrado / Deuda | Media | — | Pendiente (parcial) | §2.7 |
| FUT-VAR-09 | Documentar la vía de escritura de ciphertext | Cifrado / Docs | Media | — | Pendiente (parcial) | §2.8 |
| FUT-VAR-10 | Código de error `deleted_variable` | Variables / i18n | Baja | [Soft-delete (terminado)](../plans.done/AGENTS.soft-delete.PLAN.md) | Pendiente | §2.9 |
| FUT-VAR-11 | Documentación de variables (inmutabilidades, `internal`/`group`, `en`) | Variables / Docs | Media | [Soft-delete (terminado)](../plans.done/AGENTS.soft-delete.PLAN.md), FUT-VAR-03, FUT-VAR-04 | Pendiente (parcial) | §2.10 |
| FUT-WF-01 | Módulos/submódulos definidos por el usuario | Workflows | Baja | — | Pendiente | §3.1 |
| FUT-WF-02 | Fusión/diff al actualizar una plantilla | Workflows | Media | — | Pendiente | §3.1 |
| FUT-WF-03 | Plantilla `web_symfony_compose_backup` | Workflows / Plantillas | Baja | — | Pendiente | §3.1 |
| FUT-WF-04 | Plantilla `web_symfony_deploy` sin Docker | Workflows / Plantillas | Baja | — | Pendiente | §3.1 |
| FUT-WF-05 | Plantilla `web_laravel_deploy` | Workflows / Plantillas | Baja | — | Pendiente | §3.1 |
| FUT-WF-06 | Plantilla `web_vue_deploy` | Workflows / Plantillas | Baja | — | Pendiente | §3.1 |
| FUT-WF-07 | Plantilla `web_static_deploy` | Workflows / Plantillas | Baja | — | Pendiente | §3.1 |
| FUT-WF-08 | Plantilla `web_node_deploy` | Workflows / Plantillas | Baja | — | Pendiente | §3.1 |
| FUT-WF-09 | Plantilla `docker_dockerfile_build` | Workflows / Plantillas | Baja | — | Pendiente | §3.1 |
| FUT-WF-10 | Plantilla `docker_dockerfile_push` | Workflows / Plantillas | Baja | — | Pendiente | §3.1 |
| FUT-WF-11 | Plantillas `general_server_healthcheck` y `general_artifact_release` | Workflows / Plantillas | Baja | — | Pendiente | §3.1 |
| FUT-WF-12 | Bloqueo de despliegue (`deploy:lock`) | Workflows / Ejecución | Media | — | Pendiente | §3.1 |
| FUT-WF-13 | Plantillas para otros frameworks y multi-host | Workflows / Plantillas | Baja | — | Pendiente | §3.1 |
| FUT-WF-14 | Nodos especializados de despliegue Docker y web | Workflows / Nodos | Baja | — | Pendiente | §3.1 |
| FUT-WF-15 | Disparadores por cron o eventos | Workflows | Media | Futuro módulo de tareas | Pendiente | §3.1 |
| FUT-WF-16 | Nodo HTTP | Workflows / Nodos | Baja | — | Pendiente | §3.1 |
| FUT-WF-17 | Sub-flujos | Workflows / Motor | Baja | — | Pendiente | §3.1 |
| FUT-WF-18 | Bucles / `foreach` | Workflows / Motor | Media | — | Pendiente | §3.1 |
| FUT-WF-19 | Notificaciones | Workflows | Baja | — | Pendiente | §3.1 |
| FUT-WF-20 | Fan-out a varios hosts | Workflows / Ejecución | Media | — | Pendiente | §3.1 |
| FUT-WF-21 | Rotación, auditoría y desclasificación de secretas globales | Workflows / Seguridad | Media | FUT-VAR-05 | Pendiente | §3.1 |
| FUT-WF-22 | Importar/exportar plantillas y marketplace | Workflows | Baja | — | Pendiente | §3.1 |
| FUT-WF-23 | Versionado de flujos y comparación de revisiones | Workflows / Historial | Baja | — | Pendiente | §3.1 |
| FUT-WF-24 | Persistencia de logs en vivo | Workflows / Historial | Baja | — | Pendiente | §3.1 |
| FUT-WF-25 | Integración de flujos con el sistema de ajustes | Workflows / Ajustes | Baja | Plan de ajustes | Pendiente | §3.1 |
| FUT-TECH-01 | Verificar en Tauri el round-trip de una variable secreta | Variables / Verificación | Alta | — | Pendiente | §4.1 |
| FUT-TECH-02 | Corregir la documentación de formularios JSON-Schema retirados | Docs | Media | — | Pendiente | §4.2 |
| FUT-TECH-03 | Resolver la referencia al plan de seed inexistente | Proceso / Docs | Baja | — | Pendiente | §4.3 |

---

## 2. Variables globales y cifrado

### 2.1. `FUT-VAR-02` — Renombrado explícito de `slug`

El `slug` seguirá siendo inmutable por defecto. El renombrado será una operación dedicada,
nunca un campo editable. Depende del plan de soft-delete
(`.agents/plans.done/AGENTS.soft-delete.PLAN.md`) para no reutilizar slugs de la papelera.

**Requisitos**

1. **Buscar referencias** a `{{global.<slug>}}` en todo lo que pueda contener plantillas:
   - `deployer_commands.command` (scripts de shell).
   - Tablas de workflows: `variables`, `inputs` (valores por defecto), configuración de nodos,
     `env`, condiciones, etc. (JSON).
   - Cualquier otra tabla con contenido ejecutable o plantillas.
2. **Mostrar impacto** antes de confirmar: entidades afectadas con nombre y tipo, y recuento.
3. **Confirmación explícita** con aviso de que las referencias se reescribirán.
4. **Actualización coherente**:
   - Actualizar el `slug` de la variable.
   - Reescribir las referencias encontradas.
   - En una transacción si el driver lo permite; si no, aplicar primero las referencias y dejar
     el `slug` para el final, con validación previa.
5. **Validación** de unicidad y formato antes de empezar.
6. **Auditoría**: registrar el slug anterior y el nuevo (log o toast).

**Consideraciones**

- Si una referencia está en un comando de solo lectura o interno, decidir si se reescribe
  (probablemente sí, con aviso).
- Las referencias en texto no ejecutable (descripciones) no hace falta reescribirlas, pero
  conviene listarlas.
- No permitir cambiar el `slug` a uno reservado por una fila en papelera.

---

### 2.2. `FUT-VAR-03` — `internal` / `custom` para variables sembradas

Solo tiene sentido si se siembran variables globales de sistema (`deploy_path`, `registry`, etc.).

- Reutilizar el patrón de `deployer_commands`: columnas `internal` y `custom`.
- `internal = true` para las variables que no debe editar el usuario (o solo deshabilitar).
- `custom = false` para las sembradas; `true` para las creadas por el usuario.
- UI:
  - Ocultar o marcar las internas.
  - No permitir borrar físicamente las internas desde la UI.
- Seed:
  - Filtro de filas sembradas, equivalente a `commands`: `seedWhere: sql\`custom = '0'\``.
  - `resetValues` que no revienten cambios del usuario.
- Documentar que “interna” y “secreta” son ejes independientes.

---

### 2.3. `FUT-VAR-04` — `group` / tags del catálogo

Mejora de UI, no del motor.

- Añadir `group` (texto) o una tabla de tags si se prevé multietiqueta.
- Filtrar y agrupar en el listado y en el autocompletado de variables.
- No afecta a la interpolación: el path sigue siendo `{{global.<slug>}}`.
- Evaluar antes si el catálogo real crece lo suficiente como para justificarlo.

---

### 2.4. `FUT-VAR-05` — Desclasificación explícita de variables secretas

Si alguna vez se permite que una variable secreta vuelva a ser pública:

- Será una operación dedicada, no un toggle.
- Leer el valor con `withDecryption(true)`.
- Escribir el texto plano y `is_secret = false` **en el mismo statement**, para que el proxy
  no trate el valor como secreto.
- Confirmación doble y aviso de que el secreto queda expuesto en claro en la BD.
- Toast/registro de la acción.
- Mantener el trigger descartado: la regla se aplica en la capa de consultas.

---

### 2.5. `FUT-VAR-06` — Endurecer `is_encrypted()` en Rust

`crypto::is_encrypted()` (`src-tauri/src/crypto/cipher.rs`) usa solo el prefijo `ENC:`.

- Validar el formato (`ENC:{version}:<base64>` y, si se acepta, `ENC:<base64>`), con
  decodificación base64 y longitud mínima.
- Impacto: `src-tauri/src/ssh/session.rs`,
  `src-tauri/src/commands/passkeys/export_public_key.rs`,
  `src-tauri/src/commands/passkeys/derive_passkey_info.rs`.
- Los valores vienen de la BD, no de input directo, así que el riesgo actual es bajo.

---

### 2.6. `FUT-VAR-07` — Auditoría de datos cifrados existentes

Buscar en la BD valores en columnas cifradas que:

- Empiecen por `ENC:` pero **no** sean tokens válidos.
- Sean exactamente `BLANK_VALUE`.

Podrían haberse guardado en claro por la debilidad anterior. Si aparecen, decidir si se
re-cifran o se avisa al usuario.

---

### 2.7. `FUT-VAR-08` — Consolidar centinelas

**Parcial:** `isCiphertextToken()` ya existe en `src/drizzle/lib/stronghold.ts` y el proxy lo usa
para descifrar/enmascarar. Falta:

- Unificar `BLANK_VALUE`, `ENC_PREFIX` e `isCiphertextToken` en un único módulo
  (`src/drizzle/lib/sentinels.ts` o similar). Hoy `BLANK_VALUE` está duplicado en:
  - `src/drizzle/lib/crypto.ts`.
  - `src/utils/crypto.ts`.
- Hacer que `isEncryptedValue()` de `src/utils/crypto.ts` use la guarda estricta
  (`isCiphertextToken`) en lugar de `startsWith('ENC:')`.

---

### 2.8. `FUT-VAR-09` — Documentar la vía de escritura de ciphertext

**Parcial:** el formato `ENC:` y el vault están documentados en `AGENTS.backend.md` §4, pero la
vía de escritura de ciphertext ya cifrado no. Además, la línea 176 de ese documento dice que un
valor que ya empieza por `ENC:` no se vuelve a cifrar; el proxy actual ya no funciona así
(`encryptParams()` cifra todo salvo `BLANK_VALUE` y cadena vacía).

Pendiente:

- Documentar en `AGENTS.backend.md` que las escrituras de ciphertext ya cifrado deben usar
  `query_raw` y nunca el proxy. Ya ocurre así en `reencrypt`
  (`src/drizzle/lib/stronghold.ts`).
- Corregir la afirmación obsoleta sobre el prefijo `ENC:`.
- Opcional: si se quiere cubrir un valor de usuario igual a `BLANK_VALUE`, añadir un prefijo
  de escape (por ejemplo `\BLANK:`) que se desescapa al leer. No se considera necesario por
  la improbabilidad del valor.

---

### 2.9. `FUT-VAR-10` — Código de error `deleted_variable`

La base de soft-delete ya está implementada; queda adaptar el motor de interpolación:

- Una variable con `deleted_at` no resuelve.
- Hoy el error sería `unknown_variable`, correcto pero poco claro.
- Añadir un código `deleted_variable` en `InterpolationErrorCode`
  (`src/utils/interpolation/types.ts`) y su clave i18n en `es` y `en`.
- Aplicar en `checkReference()` y `resolveReference()` del resolvedor.
- No requiere campos nuevos ni cambios de esquema.

---

### 2.10. `FUT-VAR-11` — Documentación de variables

**Parcial:** `docs/content/es/008.variables/1.overview.md` ya documenta la inmutabilidad del
`slug`, la de `is_secret` y el filtro `deleted_at IS NULL`. Queda:

- Equivalente completo en `en` (hoy no existe la sección de variables).
- Si se añaden `internal`/`custom` o `group`/tags, documentar su significado y su efecto en
  el seed.
- Documentar que toda escritura de variables pasa por `useVariableQuery` /
  `normalizeVariableUpdate()`.
- Endurecimiento de centinelas (si se documenta para usuarios avanzados).

La corrección de la nota de soft-delete de `1.overview.md` corresponde al plan
`.agents/plans.done/AGENTS.soft-delete.PLAN.md`; no duplicarla aquí.

---

## 3. Workflows por nodos

### 3.1. Backlog de workflows

El diseño base (`FUT-WF-00`, cerrado el 2026-11-12) vive en
`.agents/AGENTS.node-workflows.DESIGN.md`: los secretos son variables globales con
`required_secrets` y expresiones `{{ global.<slug> }}`. Sigue siendo **diseño**, no plan.

Items extraídos de su §20. El detalle de cada uno vive en ese diseño; aquí se registran para no
perderlos.

- **`FUT-WF-01`** Módulos y submódulos definidos por el usuario (tabla
  `deployer_workflow_modules`).
- **`FUT-WF-02`** Fusión o diff automático cuando una plantilla se actualiza y la copia tiene
  cambios propios.
- **`FUT-WF-03`** Plantilla `web_symfony_compose_backup` para respaldar logs y volúmenes Docker
  antes del despliegue (equivalente a `download:backups` de DeployerPHP).
- **`FUT-WF-04`** Plantilla `web_symfony_deploy` sin Docker (releases + Composer + PHP-FPM).
- **`FUT-WF-05`** Plantilla `web_laravel_deploy`.
- **`FUT-WF-06`** Plantilla `web_vue_deploy` con build local y `dist/` precompilado.
- **`FUT-WF-07`** Plantilla `web_static_deploy`.
- **`FUT-WF-08`** Plantilla `web_node_deploy` con build en el servidor.
- **`FUT-WF-09`** Plantilla `docker_dockerfile_build` (contexto + build + `docker run`).
- **`FUT-WF-10`** Plantilla `docker_dockerfile_push` con publicación en registry.
- **`FUT-WF-11`** Plantillas `general_server_healthcheck` y `general_artifact_release`.
- **`FUT-WF-12`** Bloqueo de despliegue (`deploy:lock`) más allá de la limitación de una
  ejecución simultánea por flujo/host.
- **`FUT-WF-13`** Plantillas para otros frameworks (Django, Rails, Astro, Next.js...) y para
  despliegues multi-host.
- **`FUT-WF-14`** Nodos especializados de despliegue Docker y web.
- **`FUT-WF-15`** Disparadores por cron o eventos (relacionado con el futuro módulo de tareas).
- **`FUT-WF-16`** Nodo HTTP.
- **`FUT-WF-17`** Sub-flujos.
- **`FUT-WF-18`** Bucles / `foreach`.
- **`FUT-WF-19`** Notificaciones.
- **`FUT-WF-20`** Fan-out a varios hosts.
- **`FUT-WF-21`** Rotación de variables globales secretas, auditoría de accesos y
  desclasificación explícita.
- **`FUT-WF-22`** Importar/exportar plantillas entre instalaciones y repositorio/marketplace
  de plantillas.
- **`FUT-WF-23`** Versionado de flujos y comparación de revisiones.
- **`FUT-WF-24`** Persistencia de logs en vivo.
- **`FUT-WF-25`** Integración con el sistema de ajustes para valores por defecto y retención.

---

## 4. Deuda técnica transversal

### 4.1. `FUT-TECH-01` — Verificación runtime del round-trip de variables secretas

La lógica está aplicada y el build pasa, pero falta comprobar en la app real con Tauri:

1. Crear una variable secreta.
2. Actualizar solo `value` (sin enviar `is_secret`).
3. Leer el valor crudo con `query_raw` y comprobar que empieza por `ENC:` y no por el texto plano.
4. Repetir enviando el formulario completo (con `BLANK_VALUE`) y comprobar que el ciphertext
   anterior se conserva.

No hay script de test en `package.json`; además, `bun test` falla hoy porque los tests de
`tests/` importan módulos eliminados. Es una verificación manual en `bun run tauri:dev`.

### 4.2. `FUT-TECH-02` — Documentación de formularios JSON-Schema

`AGENTS.frontend.md` §8 y el gotcha de `AGENTS.md` describen un sistema de formularios
JSON-Schema (`src/utils/schema-form/*`, `SchemaField*`, `JsonSchemaEditor.vue`) que ya no existe
en `src/`. Corregir ambos documentos en la próxima pasada.

### 4.3. `FUT-TECH-03` — Resolver la referencia al plan de seed inexistente

El plan `AGENTS.seed-system.PLAN.md` **no existe** en `.agents/plans/` ni en
`.agents/plans.done/`. El seed real es TS (`src/composables/deployer/seed_data/`).
Decidir si el bloque se descarta o se documenta el seed actual; eliminar la referencia rota.

---

## 5. Planes ya extraídos (no duplicar aquí)

| Plan | Estado | Notas |
| --- | --- | --- |
| [`AGENTS.settings-system.PLAN.md`](./AGENTS.settings-system.PLAN.md) | Planificando | Implementación a futuro. No ejecutar. |
| [`AGENTS.plugin-sql.PLAN.md`](./AGENTS.plugin-sql.PLAN.md) | Planificando | Pendiente de decidir viabilidad (fase 0). |
| [`AGENTS.custom-tables.PLAN.md`](./AGENTS.custom-tables.PLAN.md) | Plan existente | Sin implementar en código (no hay entidades `deployer_custom_*`). |
| [`../plans.done/AGENTS.soft-delete.PLAN.md`](../plans.done/AGENTS.soft-delete.PLAN.md) | Terminado | Extraído de `FUT-VAR-01`: papelera, purga y decisiones transversales. Archivado el 2026-11-16. |
| [`../AGENTS.node-workflows.DESIGN.md`](../AGENTS.node-workflows.DESIGN.md) | Diseño | No es plan. Requiere plan aprobado antes de implementar. |

---

## 6. Historial de extracciones y cierres

| Fecha | Bloque | Destino | Resultado |
| --- | --- | --- | --- |
| 2026-11-12 | `FUT-WF-00` (diseño `global` / `required_secrets`) | `AGENTS.node-workflows.DESIGN.md` | Hecho |
| 2026-11-12 | `FUT-VAR-01` (soft delete) | `AGENTS.soft-delete.PLAN.md` | Extraído; parte estructural ya implementada |
| 2026-11-16 | `FUT-VAR-01` (soft delete) | `plans.done/AGENTS.soft-delete.PLAN.md` | Terminado y archivado; `settings` sigue apartado |
| 2026-11-12 | Backlog de variables (antiguo `AGENTS.variables-futuro.PLAN.md`) | Este documento, §2 | Consolidado |
| 2026-11-12 | Análisis `AGENTS.variables.ANALYSIS.md` | Este documento, §2 + `AGENTS.done.md` | Consolidado y eliminado |
| 2026-11-12 | Backlog de workflows (antiguo §20 del diseño) | Este documento, §3.1 | Consolidado |
