# Plan: Correcciones del gestor de archivos (1/2) — Scope local y expansión del árbol

## Estado

**Terminado** — verificado y cerrado por el usuario el 2026-11-23.

**Diseño de origen:** ninguno (dos correcciones puntuales sobre la serie `remote-file-manager`, ya cerrada).

**Serie:** `file-manager-fixes` — plan 1 de 2. Hermanos: `AGENTS.file-manager-fixes-progress.PLAN.md`.
**Dependencia:** ninguna.
**Orden de ejecución:** 1 de 2. Independiente del plan 2: ninguno consume el resultado del otro, así que pueden ejecutarse en cualquier orden.

---

## Instrucciones dadas (verbatim)

> "Errores encontrado en el nuevo módulo "Gestor de archivos"
>     1. Vista de servidor local:
>         - Cuando listas el contenido y haces clic en la carpeta "F:\Tools\deployer-app\_archived.dist\downloads\n8n\2026" dice que hubo un error.
>         - La carpeta n8n/2026, fue descargada desde el servidor usando este nuevo módulo."

> "En la vista de archivos, se debería ver un botón para ver el arbol completo de items (es decir, apliar la vista del contenido de dicho directorio), pero que eso no marque (el checkbox) el archivo o directorio. Actualmente para ver el contenido del directorio se tiene que hacer click en el nombre, lo cual marca el directorio como que lo quieres cargar o descargar."

Contexto aportado por el agente (análisis previo):

- La ruta `F:\Tools\deployer-app\_archived.dist\downloads\n8n\2026` existe y contiene `November/` y `pfc-webserver-1_logs.tar`; en `November/21/logs/` hay tres `.tar`. No es una ruta inexistente ni un enlace simbólico; **no modificar ni leer como contenido editable** `_archived.dist` (regla de `AGENTS.md`).
- Causa confirmada del error: `chooseLocalRoot()` en `FileManagerPanel.vue` llama a `open({ directory: true, multiple: false, title })` sin `recursive: true`. El plugin `dialog` ejecuta `fsScope.allow_directory(path, options.recursive)` con `false` por defecto, por lo que el scope autoriza el directorio elegido y sus hijos directos, pero no los subdirectorios. `readDir(root)` funciona y `readDir(child dir)` falla con `forbidden path`. La API JS instalada expone `recursive?: boolean` en `node_modules/@tauri-apps/plugin-dialog/dist-js/index.d.ts`.
- Los permisos `fs:allow-read-dir` y `fs:allow-stat` ya están en `src-tauri/capabilities/default.json`: el fallo es del **scope dinámico**, no de la capability.
- `UTree` pasa `handleToggle` y `handleSelect` como props de slot independientes (`node_modules/@nuxt/ui/dist/runtime/components/Tree.vue`, líneas 123–151), junto con `expanded`. El botón puede usar `handleToggle()` sin tocar `handleSelect`.
- El usuario eligió que el botón expanda **un solo nivel** (igual que la flecha, pero sin marcar casillas), no todo el subárbol.

---

## Objetivo

Corregir la navegación local del gestor para que los subdirectorios de la carpeta raíz elegida se puedan listar, con un mensaje de error que identifique la ruta y el motivo, y añadir un botón en cada directorio del árbol que expanda/contraiga **un nivel** sin alterar la selección de casillas.

**No entra en este plan:** el progreso por archivo y el pre-listado recursivo (plan 2), crear/renombrar/borrar archivos, editar contenido remoto, drag & drop, virtualización, ni modificar `capabilities/default.json` o `_archived.dist`.

---

## Contexto técnico actual

- `src/components/remote/file-manager/FileManagerPanel.vue`:
  - `chooseLocalRoot()` usa `open()` sin `recursive` y guarda la ruta en `localRoot`; `listDirectory()` llama a `readDir(path)` y, en local, construye entradas con `buildLocalEntries()` usando `stat()`.
  - El error local se muestra en `<p v-if="errorMessage" class="mx-3 mt-2 text-sm text-error">{{ errorMessage }}</p>` (línea 293), alimentado por un `catch` que asigna un texto genérico.
  - `loadChildren()` ya pide solo el nivel hijo al expanding un directorio; el bug está en el scope, no en la carga por niveles.
  - El panel remoto usa `ssh_list_remote_dir` y no se toca.
- `src/components/remote/file-manager/FileTree.vue`:
  - `#item-leading` contiene la `UCheckbox` con `@change="handleSelect"` y `@click.stop`.
  - `#item-trailing` contiene el botón «Abrir carpeta» que emite `activate` con `@click.stop`; el clic en el nombre selecciona sin querer porque `UTree` usa `as { link: 'div' }` con selección múltiple.
  - `handleToggle(event, node)` (líneas 82–86) ya emite `load-children` solo cuando el nodo se **expande** (`detail?.isExpanded !== false`) y es un directorio.
- `src/locales/es/components/file_manager.ts` y su espejo `en`: `errors.load` es el texto genérico actual; `entry.open` es «Abrir carpeta» / «Open folder».
- `src-tauri/src/ssh/…` no participa: no hay comando Rust nuevo ni cambios en la BD.

---

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-23 | Dos planes en serie, separando las correcciones de UI del progreso por archivo (decisión del usuario). |
| 2026-11-23 | El botón del árbol expande/contrae **un solo nivel** reutilizando `handleToggle`; no carga recursivamente todo el subárbol (decisión del usuario). |
| 2026-11-23 | El botón **no** marca ni desmarca casillas: `@click.stop` y `handleToggle()`, sin llamar a `handleSelect` (decisión del usuario). |
| 2026-11-23 | Corregir el scope con `recursive: true` en `open()`; no ampliar `capabilities/default.json` ni añadir comandos Rust (decisión del agente, basada en el código del plugin). |
| 2026-11-23 | El mensaje de error incluirá la ruta que falló y el motivo devuelto por `plugin-fs`, con clave i18n nueva en `es` y `en` (decisión del agente). |
| 2026-11-23 | Documentación de usuario solo en `docs/content/es/008.file-manager/` hasta confirmación (regla del proyecto). |

**Alternativas descartadas:** expansión recursiva de todo el subárbol (el usuario eligió un solo nivel), añadir `fs:scope` global en la capability (el permiso ya existe; el scope dinámico es la causa), ocultar el error o mostrar solo «hubo un error» (no aporta información para diagnosticar), crear un comando Rust para listar local (el frontend ya usa `plugin-fs`).

---

## Problemas y riesgos encontrados

### P1 — Scope de `plugin-dialog` insuficiente para subdirectorios

- `allow_directory(path, false)` autoriza el directorio y sus hijos directos, pero no los nietos. `readDir()` del raíz funciona y el de `November/` falla, que es exactamente el síntoma descrito.
- **→ Riesgo ALTO.** Pasar `recursive: true` en la llamada a `open()`. Se valida con el caso concreto: elegir `…\n8n\2026` como raíz y abrir `November/` y `November/21/logs/`.

### P2 — Error sin información accionable

- Hoy `errorMessage` es un texto genérico; no permite saber qué ruta falló ni por qué.
- **→ Riesgo MEDIO.** Añadir una clave i18n con parámetros `{path}` y `{reason}` y rellenarlos desde el `catch` de `listDirectory()`/`loadChildren()`. Los mensajes del backend siguen siendo claves i18n; aquí el motivo es texto del sistema de archivos local, por lo que se interpola como parámetro.

### P3 — Colisión del botón con la selección de `UTree`

- El clic dentro del `<li>` puede propagarse y activar `handleSelect` si no se detiene.
- **→ Riesgo MEDIO.** Usar `@click.stop` en el `UButton`, invocar solo `handleToggle()` del slot y mantener `handleSelect` exclusivamente en la `UCheckbox`. Verificar que la casilla permanece intacta tras expandir y contraer.

### P4 — Tipos y documentación

- No se generan tipos nuevos (no hay comandos Rust ni `ts-rs`), pero `typed-locale.d.ts` es autogenerado al añadir claves i18n.
- **→ Riesgo BAJO.** El usuario regenera `typed-locale.d.ts` con `bun run i18n:types`. La documentación se ajusta al comportamiento real del código.

---

## Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — Scope local y mensaje de error

1. En `src/components/remote/file-manager/FileManagerPanel.vue`, modificar `chooseLocalRoot()` para pasar `recursive: true` a `open()` (`{ directory: true, multiple: false, recursive: true, title }`), conservando el título actual.
2. Centralizar el tratamiento del error local: en `listDirectory()` y en la función que carga hijos, capturar el fallo de `readDir`/`stat` y asignar `errorMessage.value = t('components.file_manager.errors.read_local', { path, reason })`; extraer el motivo de `error instanceof Error ? error.message : String(error)`.
3. Añadir `errors.read_local` en `src/locales/es/components/file_manager.ts` y `src/locales/en/components/file_manager.ts`, p. ej. «No se pudo leer «{path}»: {reason}» / «Could not read “{path}”: {reason}». Mantener `errors.load` para el resto de errores.

### Fase 2 — Botón de expansión sin selección

1. En `src/components/remote/file-manager/FileTree.vue`, ampliar el slot `#item-trailing` para recibir `handleToggle` y `expanded`, y añadir un `UButton` para directorios con icono de chevron (abajo/arriba según `expanded`), `size="xs"`, `variant="ghost"`, tooltip i18n nuevo (`entry.expand` / `entry.collapse`) y `@click.stop="handleToggle()"`.
2. Situar el botón junto al existente «Abrir carpeta», manteniendo el orden y el estilo de los controles actuales; no tocar `#item-leading` ni la `UCheckbox`.
3. Comprobar que `handleToggle()` dispara el `@toggle` de `UTree`, que ya llama a `handleToggle(event, node)` y emite `load-children` solo al expandir. No añadir lógica de carga nueva.

### Fase 3 — Documentación y cierre

1. Actualizar `docs/content/es/008.file-manager/1.navigation.md`: la carpeta local elegida permite recorrer subdirectorios; el botón nuevo del árbol expande un nivel sin marcar la casilla.
2. Regenerar `typed-locale.d.ts` (paso manual del usuario, `bun run i18n:types`) y verificar las comprobaciones de la sección *Verificación* de `AGENTS.md` (el agente no las ejecuta salvo petición expresa).

---

## Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src/components/remote/file-manager/FileManagerPanel.vue` | `recursive: true` en `open()`; error local con ruta y motivo en `listDirectory()` y en la carga de hijos. |
| `src/components/remote/file-manager/FileTree.vue` | Botón en `#item-trailing` que usa `handleToggle()` con `@click.stop`, sin `handleSelect`. |
| `src/locales/es/components/file_manager.ts` | `errors.read_local`, `entry.expand`, `entry.collapse`. |
| `src/locales/en/components/file_manager.ts` | Espejo de las claves nuevas. |
| `docs/content/es/008.file-manager/1.navigation.md` | Navegación de subdirectorios locales y botón de expansión de un nivel. |
| `typed-locale.d.ts` | Regenerado por el usuario al añadir claves i18n (no editar a mano). |

---

## Verificación (manual)

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa. Aquí solo van los pasos funcionales; los comandos de la clave *Verificación* de la configuración del proyecto no se listan.

1. Elegir como raíz local `F:\Tools\deployer-app\_archived.dist\downloads\n8n\2026` y comprobar que lista `November/` y `pfc-webserver-1_logs.tar` sin error.
2. Abrir `November/`, después `21/` y después `logs/`; comprobar que aparecen los tres `.tar` sin mensaje de error.
3. Probar el mismo recorrido eligiendo otra raíz distinta para descartar que el arreglo dependa de esa ruta concreta.
4. Forzar un fallo de lectura (por ejemplo, elegir una raíz y eliminar/mover un subdirectorio ya listado desde el Explorador) y comprobar que el mensaje muestra la ruta y el motivo.
5. En el árbol, pulsar el botón nuevo de un directorio: se expande un nivel, carga sus hijos y **no** cambia ninguna casilla; volver a pulsarlo contrae sin cambiar la selección.
6. Verificar que «Abrir carpeta» sigue navegando al directorio y que marcar una casilla sigue seleccionando el ítem para transferir.

---

## Criterios de aceptación

- [ ] Elegir una carpeta local como raíz permite listar recursivamente sus subdirectorios pulsando nivel a nivel; el caso `…\n8n\2026\November\21\logs` funciona.
- [ ] El error de lectura local muestra la ruta afectada y el motivo, con texto traducido en `es` y `en`.
- [ ] El botón nuevo del árbol expande y contrae un solo nivel y no modifica la selección de casillas.
- [ ] La navegación y la selección actuales siguen funcionando igual; no hay comandos Rust nuevos ni cambios en `capabilities/default.json`.
- [ ] Documentación `es` actualizada y tipos i18n regenerados por el usuario.

### Desviaciones

1. El tratamiento del error local se centralizó en `localReadError()` dentro de `listDirectory()`. `loadChildren()` ya pasa por `listDirectory()`, así que no hizo falta duplicar el `catch` en dos sitios. El mensaje sigue mostrando ruta y motivo.
2. El `handleToggle` que expone el slot de `UTree` cambia el estado expandido pero **no** emite `@toggle` (verificado en `node_modules/reka-ui/src/Tree/TreeItem.vue`, `defineExpose` en la línea 172). Por eso se añadió `expandOneLevel(node, isExpanded)`, que pide el nivel hijo al expandir, igual que hace el `@toggle` de la flecha. Sin esto el botón expandiría visualmente pero no cargaría los hijos.
3. El botón reutiliza `ICONS.app.chevronDown` con rotación CSS para contraer, en lugar de añadir un icono nuevo a `ICONS.actions`.

---

## Puntos abiertos

1. Ninguno: el alcance del botón (un solo nivel, sin marcar) y la corrección del scope ya fueron decididos por el usuario.

---

## Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-23 | Plan creado en estado **Planificando**. |
| 2026-11-23 | Pasado a **Ejecutando** por instrucción del usuario. |
| 2026-11-23 | Fases 1–3 implementadas: `recursive: true`, error local con ruta y motivo, botón de expansión de un nivel sin selección, i18n `es`/`en` y documentación `es`. |
| 2026-11-23 | Verificación confirmada por el usuario («Todo ok»); plan dado por terminado y archivado. |
