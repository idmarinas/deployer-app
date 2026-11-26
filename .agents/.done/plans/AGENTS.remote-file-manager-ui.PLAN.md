# Plan: Gestor de archivos remoto de doble panel (2/3) — Interfaz de doble panel

## Estado

**Terminado** — verificado por el usuario el 2026-11-22.

**Diseño de origen:** `.agents/.done/designs/AGENTS.remote-file-manager.DESIGN.md`. Corresponde al bloque 2 de la sección 7 del diseño.
**Serie:** `remote-file-manager` — plan 2 de 3. Hermanos: `AGENTS.remote-file-manager-backend.PLAN.md`, `AGENTS.remote-file-manager-queue.PLAN.md`.
**Dependencia:** requiere `AGENTS.remote-file-manager-backend.PLAN.md` (comando `ssh_list_remote_dir` y sus tipos `ts-rs`).
**Orden de ejecución:** 2 de 3. Lo consume el plan de cola (3/3), que conectará las acciones y los slots preparados aquí.

> **Revisión (2026-11-20):** los archivos y directorios ocultos se muestran por defecto en ambos paneles (decisión del usuario en el plan 1, `c1`). Se refuerza que cada panel carga solo el nivel visible.

---

## Instrucciones dadas (verbatim)

> "Si prepara un plan para el diseño de gestor de doble panel, ten encuenta que tenemos un componente que es para mostrar un árbol de archivos TreeFiles.
>
> En cuanto a esto russh-extra 0.1.7 prepara una comparativa para determinar si es conveniente usarlo, sí tiene todo lo que usamos, y así no tener que mantener código propio."

Instrucciones posteriores (verbatim):

> "Nuevo con UTree (Recomendado)"
>
> "Esto lo instalo yo ahora."
>
> "plugin-fs (Recomendado)"
>
> "Es una nueva página que estará debajo de Consola remota, tendrá el selector de host en el mismo lugar que consola remota."
>
> "Solo transferir y cancelar (Recomendado)"
>
> "Que lo haga el plan de UI"
>
> "Bien, ya puedes crear el plan."

Contexto aportado por el agente (análisis previo):

- `TreeFiles` no existe en el código activo: fue eliminado en `f10bb71` y era un editor en memoria de `ManagedFile[]`, no un navegador de sistema de archivos.
- El patrón de árbol vivo es `src/components/overlay/forms/ReviewFilesDialog.vue`, que construye `TreeItem[]` y usa `UTree` de `@nuxt/ui`.
- `@tauri-apps/plugin-fs` y `tauri-plugin-fs` ya están instalados por el usuario, pero `src-tauri/capabilities/default.json` aún no concede permisos `fs`.
- `src/composables/useNavigationMenu.ts` define «Consola remota» en `navigationMenuFooter`; ahí se insertará la nueva entrada justo debajo.

---

## Objetivo

Crear la página de doble panel con navegación local y remota, selección de archivos y botones de transferencia que **emitan la intención** de subir/descargar, dejando la ejecución real, la cola y el progreso para el plan 3.

**No entra en este plan:** ejecución de transferencias, cola, progreso, cancelación, store de marcas «descargado», documentación de usuario y cambios en el backend.

---

## Contexto técnico actual

- `src/pages/dashboard/console.vue` usa `UDashboardPanel` → `UDashboardNavbar` → `UDashboardToolbar` con `SelectHost`, y `UTabs` para las operaciones puntuales. La nueva página replicará la cabecera y el selector de host, sin tocar la consola.
- `src/composables/useNavigationMenu.ts`, en `navigationMenuFooter`, coloca «Consola remota» con `icon: ICONS.server.terminal` y `to: { name: 'dashboard-console' }`. El rótulo viene de `components.sidebar.console`.
- `unplugin-vue-router` genera `src/route-map.d.ts` desde `src/pages/`; no se edita a mano.
- `@tauri-apps/plugin-dialog` ya está disponible para elegir la raíz local; `@tauri-apps/plugin-fs` permite `readDir` y `stat`.
- `src-tauri/capabilities/default.json` solo concede `core:default`, `opener:default`, `dialog:default`, `store:default`, `stronghold:default` y `stronghold:allow-remove-store-record`.
- `src/components/overlay/forms/ReviewFilesDialog.vue` muestra cómo tipar nodos con `TreeItem`, construir jerarquías por rutas con `/`, ordenar directorios primero y usar slots con `UTree`.
- `src/locales/es/components/sidebar.ts` y su espejo `en` usan claves snake_case (`console`, `trash`, …); los textos de página y componentes viven en `src/locales/{es,en}/pages/` y `components/`.

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-20 | Página nueva `dashboard/file-manager`, justo debajo de «Consola remota», con `SelectHost` en la misma posición de la barra de herramientas (decisión del usuario). |
| 2026-11-20 | Árbol nuevo con `TreeItem` + `UTree`; no se restaura el `TreeFiles` histórico (decisión del usuario). |
| 2026-11-20 | Panel local con `plugin-fs`/`plugin-dialog`; las dependencias ya están instaladas, **los permisos `fs` los añade este plan** (decisión del usuario). |
| 2026-11-20 | Primera versión solo navegar/transferir/cancelar; este plan prepara las acciones pero no las ejecuta (decisión del usuario). |
| 2026-11-20 | Botones `→`/`←` como mecanismo principal; drag & drop solo si la API lo permite, con `forceFallback: true` y `watchElement: true` en Tauri. |
| 2026-11-20 | Archivos ocultos visibles por defecto en los paneles local y remoto (decisión del usuario, `c1` en el plan 1). |
| 2026-11-20 | Cada panel carga solo el nivel en el que está; no se precargan niveles hijos (decisión del usuario, `c3` en el plan 1). |

**Alternativas descartadas:** restaurar `TreeFiles` desde git (dependencias eliminadas y modelo en memoria), añadir una cuarta pestaña a `console.vue` (decisión del usuario), comandos Rust para listar el filesystem local (la guía del proyecto los reserva para lógica de backend), `plugin-store` para preferencias (fuera del alcance).

---

## Problemas y riesgos encontrados

### P1 — Rendimiento con Many items

- Un árbol con miles de nodos puede colapsar el render si se construye completo.
- **→ Riesgo MEDIO.** Cargar solo el nivel visible al expandir, usar el `max_entries`/`truncated` del backend y, si `UTree` no escala, caer a una lista plana con casillas de selección por directorio.

### P2 — Permisos del plugin de archivos

- Sin permisos `fs` en `capabilities/default.json`, `readDir`/`stat` fallan en runtime aunque la dependencia esté instalada.
- **→ Riesgo MEDIO.** Añadir los permisos mínimos de lectura de directorios y archivos necesarios para las API usadas, y verificarlo funcionalmente en la app.

### P3 — Arrastrar y soltar en Tauri

- El HTML5 drag & drop nativo no funciona de forma fiable en el webview; los contenedores condicionales tampoco refrescan el drop target.
- **→ Riesgo MEDIO.** Sortable.js con `forceFallback: true` y `watchElement: true`; si no es estable, los botones siguen siendo la vía principal.

### P4 — Tipos i18n generados

- `typed-locale.d.ts` es autogenerado; las claves nuevas no se ven en TS hasta regenerarlo.
- **→ Riesgo BAJO.** El usuario ejecuta `bun run i18n:types` tras los cambios (paso manual).

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — Permisos y comprobación de dependencias

1. Verificar que `package.json` contiene `@tauri-apps/plugin-fs` y `pinia`, y que `src-tauri/Cargo.toml` contiene `tauri-plugin-fs`; no volver a instalarlos.
2. Añadir en `src-tauri/capabilities/default.json` los permisos `fs` mínimos necesarios para leer directorios y archivos con el plugin; no ampliar a escritura.

### Fase 2 — Página y navegación

1. Crear `src/pages/dashboard/file-manager.vue` con `definePage({ name: 'dashboard-file-manager' })` y la misma estructura de cabecera que `console.vue` (`UDashboardPanel`, `UDashboardNavbar`, `UDashboardToolbar` con `SelectHost`).
2. Añadir la entrada en `navigationMenuFooter` de `src/composables/useNavigationMenu.ts`, inmediatamente después de «Consola remota», con `label: t('components.sidebar.file_manager')` y un icono de `ICONS`.
3. Añadir `file_manager` a `src/locales/es/components/sidebar.ts` y `src/locales/en/components/sidebar.ts`.

### Fase 3 — Panel local

1. Crear `src/components/remote/file-manager/FileManagerPanel.vue` parametrizable por origen (`local`/`remote`), con barra de ruta (breadcrumb), botón de actualizar y selector de raíz mediante `plugin-dialog` en el caso local.
2. Listar el directorio local con `@tauri-apps/plugin-fs` (`readDir`, `stat`), mostrando nombre, tipo, tamaño y fecha, **incluidos los ocultos**; mantener la ruta con separadores nativos en local y normalizar a `/` al preparar la transferencia.
3. Implementar selección simple y múltiple de entradas, con una lista plana de respaldo si el árbol no conviene para el panel local.

### Fase 4 — Panel remoto

1. Consumir `ssh_list_remote_dir` del plan 1 con el `host_id` seleccionado; la ruta inicial será `/` y cada navegación pedirá solo un nivel.
2. Crear `src/components/remote/file-manager/FileTree.vue` inspirado en `TreeFiles`: construir `TreeItem[]` como en `ReviewFilesDialog.vue`, expandir al pedir el nivel hijo y ordenar directorios antes que archivos.
3. Mostrar metadatos de `RemoteEntry` (tamaño, fecha, permisos) y tratar `symlink`/`target` sin resolverlo en el frontend.
4. Preparar slots por nodo para estado, progreso y acciones, que el plan 3 rellenará.

### Fase 5 — Acciones de transferencia (sin ejecución)

1. Añadir botones `→` (local → remoto) y `←` (remoto → local) que validen la selección y emitan eventos con las rutas de origen/destino; no invocar ningún comando de transferencia todavía.
2. Si se implementa drag & drop entre paneles, usar Sortable.js con `forceFallback: true` y contenedores condicionales con `watchElement: true`; en caso contrario documentar que los botones son la única vía.

### Fase 6 — i18n y guías

1. Crear `src/locales/es/pages/file-manager.ts`, `src/locales/es/components/file-manager.ts` y sus espejos en `en` con todos los rótulos, estados y mensajes del gestor (sin texto quemado en los componentes).
2. Actualizar `AGENTS.frontend.md` con el patrón de la página, el uso de `UTree` para el gestor y el acceso local vía `plugin-fs`.
3. Dejar indicado al usuario que ejecute `bun run i18n:types` (paso manual).

---

## Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src/pages/dashboard/file-manager.vue` | Nueva página de doble panel con `SelectHost`. |
| `src/composables/useNavigationMenu.ts` | Entrada nueva bajo «Consola remota». |
| `src-tauri/capabilities/default.json` | Permisos `fs` de lectura. |
| `src/components/remote/file-manager/FileManagerPanel.vue` | Nuevo panel parametrizable local/remoto. |
| `src/components/remote/file-manager/FileTree.vue` | Nuevo árbol con `UTree`/`TreeItem` y slots. |
| `src/locales/es/components/sidebar.ts`, `src/locales/en/components/sidebar.ts` | Clave `file_manager`. |
| `src/locales/es/pages/file-manager.ts`, `src/locales/en/pages/file-manager.ts` | Textos de la página. |
| `src/locales/es/components/file-manager.ts`, `src/locales/en/components/file-manager.ts` | Textos de paneles, árbol y acciones. |
| `AGENTS.frontend.md` | Patrones del gestor, UTree y plugin-fs. |
| `src/route-map.d.ts`, `typed-locale.d.ts` | Autogenerados; no editar a mano. |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa.

1. Comprobar que en el menú aparece «Gestor de archivos» inmediatamente debajo de «Consola remota» y que abre la nueva página.
2. Verificar que el selector de host está en la misma posición que en la consola y que cambiar de host recarga el panel remoto.
3. Elegir una raíz local con `plugin-dialog` y listar un directorio con muchos archivos; comprobar tamaños/fechas, rutas con espacios y que los archivos ocultos aparecen.
4. Navegar un directorio remoto y expandir varios niveles: cada expansión pide solo ese nivel y la ruta del breadcrumb usa `/`.
5. Comprobar que los archivos y directorios se pueden seleccionar y que los botones `→`/`←` reaccionan a la selección sin ejecutar transferencias todavía.
6. Verificar que no aparecen textos sin traducir al cambiar entre `es` y `en`.

---

## Criterios de aceptación

- [ ] La página nueva existe, se puede abrir desde el menú y no altera la consola actual.
- [ ] `SelectHost` está en la misma posición de la barra de herramientas que en `console.vue`.
- [ ] Los permisos `fs` están concedidos en `capabilities/default.json` y el panel local lista archivos reales.
- [ ] El panel remoto consume `ssh_list_remote_dir` y carga el árbol por niveles.
- [ ] Los archivos ocultos se muestran por defecto en ambos paneles.
- [ ] `FileTree.vue` usa `TreeItem`/`UTree` y expone slots para estado/progreso/acciones.
- [ ] Las acciones de transferencia solo emiten eventos; no hay llamadas a comandos de subida/descarga.
- [ ] Los textos están en `es` y `en` y `AGENTS.frontend.md` está actualizado.

### Desviaciones

- Los módulos i18n se llaman `file_manager.ts` (no `file-manager.ts`): el generador de `typed-locale.d.ts` escribe las claves como identificadores TS y un guion produciría un nombre inválido. Las claves quedan en `pages.file_manager.*` y `components.file_manager.*`.
- Permisos `fs` concedidos solo `fs:allow-read-dir` y `fs:allow-stat`; no se usa `read_file` porque la primera versión no lee contenido de archivos.
- No se implementa drag & drop: los botones `→`/`←` son la única vía de transferencia (alternativa prevista en el plan). No se reintroduce Sortable.js.
- No se activa `virtualize` en `UTree`: el backend limita el listado a 1000 entradas por nivel y se prefiere evitar la estructura plana que impone la virtualización. Si aparecen problemas de render, es el siguiente ajuste.
- La selección múltiple usa `multiple` + `UCheckbox` sin `propagate-select`/`bubble-select`: esos modos seleccionarían hijos aún no cargados.
- Se añadieron cuatro iconos (`arrowRight`, `arrowLeft`, `file`, `symlink`) a `ICONS.actions` para no dejar literales `i-tabler-*` en los componentes.
- Los slots `node-status`/`node-progress`/`node-actions` se reenvían desde `FileManagerPanel` hasta la página, pero esta versión aún no los rellena: los usará la cola del plan 3.
- Ajustes tras el `vue-tsc` del usuario: `selected` es `shallowRef` para evitar el `UnwrapRef` recursivo de `TreeItem`; la ruta del menú lleva un cast porque `route-map.d.ts` (autogenerado) aún no incluye la página nueva; y se añadió un cast preexistente en `useSshJobs.ts` (`reactive` + `UnwrapRef` en `job.result`), error ajeno a este plan que bloqueaba el typecheck.

---

## Puntos abiertos

1. API exacta de `UTree` para selección múltiple y casillas: confirmar durante la implementación antes de decidir entre árbol con checks o lista plana.
2. Virtualización del árbol si el volumen de entradas lo exige.
3. Raíz local por defecto cuando el usuario aún no ha elegido una (no se persistirá en este plan).
4. Si los botones `→`/`←` deben permanecer deshabilitados hasta que el plan 3 conecte la cola.

---

## Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-20 | Plan creado en estado **Planificando** a partir del diseño aprobado. |
| 2026-11-20 | Revisión: ocultos visibles por defecto en ambos paneles y carga de solo el nivel visible (comentarios `c1`/`c3` del plan 1). |
| 2026-11-22 | Ejecutadas las fases 1-6: permisos `fs`, página y menú, panel local/remoto, árbol con carga por niveles, eventos de transferencia sin ejecución, i18n es/en y `AGENTS.frontend.md`. |
| 2026-11-22 | Corregidos los tres errores de `vue-tsc` detectados por el usuario (árbol, ruta autogenerada y `useSshJobs`). El usuario confirmó `Todo ok`; plan dado por terminado y archivado. |
