# Plan: Gestor de archivos remoto v3 — orden del `TreeFile`

> **Estado: Terminado** — el usuario lo dio por completado el 2026-11-25 tras verificar el gestor.
>
> **Diseño de origen:** `.agents/.done/designs/AGENTS.remote-file-manager-v3.DESIGN.md` (aprobado el 2026-11-24; cubre sus dos bloques).
>
> **Última revisión:** 2026-11-25 — cierre del plan y del diseño de origen tras la verificación del usuario. Historial completo al final (§12).

---

## 1. Instrucciones dadas (verbatim)

> Vamos a mejorar este diseño .agents\.done\designs\AGENTS.remote-file-manager-v2.DESIGN.md
>
> Por ejemplo, el orden de los archivos y directorios cuando se muestran en el TreeFile. Tiene que ser orden alfabético, pero primero son los directorios y luego los archivos.
>
> Prepara el plan de implementación

---

## 2. Objetivo y alcance

Implementar el diseño v3 aprobado en un único plan con dos fases: primero el contrato del destino de los symlinks y la retirada de la ordenación del backend, y después el comparador único en el frontend con los ajustes del panel y del árbol. El resultado debe ser un orden determinista, primero directorios y después archivos, alfabético según el idioma de la app, tanto en los paneles como en las instantáneas restauradas y en el detalle de la cola.

**Incluido en este plan:** `FileEntry.targetKind` y `RemoteEntry.target_kind`; resolución local con el `stat` existente y cálculo remoto dentro de `ssh_list_remote_dir`; eliminación de `sort_by`/`kind_rank` en Rust; creación de `src/utils/fileEntries.ts` con `Intl.Collator` cacheado (`sensitivity: 'base'`, `numeric: true`) y desempate estable; aplicación del comparador en `FileTree.vue` (niveles e hijos) y `FileManagerPanel.vue` (listado e hidratación); índice por clave, corrección del falso `truncated` local y caché de `Intl.DateTimeFormat`; uso del mismo orden en `TransferQueue.vue` sin lógica propia; regeneración manual de tipos y actualización de `AGENTS*.md` y documentación en español.

**Fuera de alcance:** no se revierten ni alteran los cambios visuales que el usuario ha hecho en el `TreeFile` (icono de selección, slots, metadatos y disposición). No se crean comandos Rust nuevos, ni migraciones SQL, ni cambios de esquema, ni claves i18n nuevas. No se añade escritura remota. La restauración de selección profunda queda aplazada como `FUT-FM-05` en `.agents/AGENTS.futuro.md`. El resto de decisiones del v2 siguen vigentes salvo decisión expresa.

---

## 3. Contexto técnico actual

- **Árbol:** `src/components/pages/file-manager/FileTree.vue` calcula `treeItems` como `props.entries.map(buildNode)` (línea 80) y `buildNode` mapea `childrenByKey[entry.key]` sin ordenar (línea 96). `formatModified` crea un `Intl.DateTimeFormat` nuevo por fila (línea 102). Lo consumen `FileManagerPanel.vue` y `TransferQueue.vue`.
- **Panel local:** `FileManagerPanel.vue::buildLocalEntries` (líneas 123-150) usa `readDir` + `stat`; el `stat` sigue enlaces, pero hoy solo se leen `size` y `mtime`. `listDirectory` marca `truncated` con `listed.length >= MAX_LIST_ENTRIES` (línea 164, tope 1000).
- **Panel remoto:** `ssh_list_remote_dir` ordena en `src-tauri/src/ssh/list.rs::list_level` con `sort_by` + `kind_rank` (dir → symlink → file → other) y nombre en minúsculas (líneas 114-119 y 191-198). `build_entry` resuelve `target` con `resolve_symlink_target` (líneas 155-159 y 175-189), pero `RemoteEntry` no informa del tipo del destino.
- **Hidratación:** `hydrateFrom` (líneas 227-239) copia `entries` y `childrenByKey` tal cual desde SQLite, por lo que las instantáneas antiguas conservan cualquier orden previo.
- **Búsqueda interna:** `knownKeys()` (líneas 241-247) y `findEntry()` (líneas 291-298) recorren `entries` y todos los `childrenByKey` en cada llamada.
- **Cola:** `TransferQueue.vue` ordena los jobs por `createdAt` (líneas 44-45) y `buildTree` construye directorios y archivos en orden de llegada; no tiene lógica de ordenación de entradas.
- **Tipos y permisos:** `FileEntry` (`src/types/fileManager.ts`, líneas 13-27) tiene `kind` y `target`, pero no `targetKind`. `src/types/tauri-types.d.ts` es autogenerado con `cargo test export_bindings`. `src-tauri/capabilities/default.json` concede solo `fs:allow-read-dir` y `fs:allow-stat`.

Contexto aportado por el agente (análisis previo):

- Un symlink a directorio debe conservar `kind: 'symlink'` y no desplegarse como directorio: `targetKind` solo decide su posición en la lista.
- Los `shallowRef` de Pinia Colada no notifican mutaciones anidadas: la ordenación debe devolver copias y las refs `entries`/`childrenByKey` deben reasignarse completas al hidratar.
- El desempate por nombre original y por `key` solo estabiliza nombres que el collator considera equivalentes; no introduce un criterio semántico nuevo.
- No hacen falta claves i18n: el cambio es de comportamiento y no añade texto visible.

---

## 4. Decisiones

| Fecha | Decisión | De quién |
| --- | --- | --- |
| 2026-11-24 | Mejorar el diseño v2 implementado mediante una v3, sin editar ni mover el v2 archivado. | usuario |
| 2026-11-24 | Orden alfabético con directorios primero y archivos después, aplicado de forma centralizada en el frontend. | usuario |
| 2026-11-24 | Los symlinks se ordenan por el tipo de su destino; rotos o desconocidos al final, tras los archivos, con las entradas `other`. | usuario |
| 2026-11-24 | Comparación por idioma con `sensitivity: 'base'` (sin tildes ni mayúsculas) y `numeric: true` (orden natural de números). | usuario (`MC c1`, `MC c3`) |
| 2026-11-24 | El backend deja de ordenar: se eliminan `sort_by` y `kind_rank`; el frontend es la única fuente del orden. | usuario (`MC c2`) |
| 2026-11-24 | Se enriquece el listado existente con el tipo de destino del symlink; no se crean comandos Rust nuevos ni migraciones. | usuario |
| 2026-11-24 | Se incluyen el índice por clave, la corrección del falso `truncated` local y la caché de fechas. | usuario (`MC c4`, `MC c5`, `MC c6`) |
| 2026-11-24 | La restauración de selección profunda se traslada al backlog como `FUT-FM-05`. | usuario (`MC c7`) |
| 2026-11-24 | Se conservan los cambios visuales del `TreeFile` hechos por el usuario. | usuario |
| 2026-11-24 | El diseño se aprueba y se implementa con **un plan único de dos fases**, no dos planes en serie. | usuario |
| 2026-11-24 | `src/types/tauri-types.d.ts` se regenera con `cargo test export_bindings`; nunca se edita a mano. | agente (según `AGENTS.backend.md`) |
| 2026-11-24 | Las verificaciones y los generadores los ejecuta el usuario; el plan solo los deja indicados. | agente (según `AGENTS.md`) |

**Alternativas descartadas:** editar el diseño v2 archivado; ordenar en Rust (ni por grupos ni por nombre); deducir el destino del symlink por heurística de rutas ya cargadas; comparador sensible a tildes o mayúsculas; orden sin natural; grupo fijo de symlinks entre directorios y archivos; dos planes en serie; alterar la apariencia actual del `TreeFile`; migración SQL para normalizar instantáneas antiguas.

---

## 5. Problemas y riesgos

### P1 — Contrato del tipo de destino y tipos autogenerados

- `RemoteEntry` solo expone `target`; añadir `target_kind` cambia la respuesta de `ssh_list_remote_dir` y los bindings de TypeScript.
- **→ Riesgo MEDIO.** El campo es `Option<String>` con valores `'dir'`/`'file'`; `FileEntry.targetKind` es opcional para no obligar a rellenarlo en entradas sintéticas. El usuario regenera `src/types/tauri-types.d.ts` con `cargo test export_bindings` antes de la verificación de tipos.

### P2 — Resolución local de symlinks

- `stat` sigue el enlace y puede fallar si está roto o fuera del scope autorizado; el panel no tiene permiso de `read_link` local.
- **→ Riesgo BAJO.** Reutilizar el `stat` ya existente: `targetKind: 'dir'` si `info.isDirectory`, `'file'` en caso contrario y `null` si falla. No cambiar `kind`, `target` ni permisos.

### P3 — Reactividad y mutación de datos persistidos

- `entries` y `childrenByKey` llegan de props, stores e instantáneas SQLite; Pinia Colada expone `data` como `shallowRef`.
- **→ Riesgo MEDIO.** `sortFileEntries` devuelve siempre una copia; `hydrateFrom` y `listDirectory` reasignan las refs completas. No mutar arrays anidados de `childrenByKey` en el sitio.

### P4 — Coherencia del comparador según idioma

- Crear un `Intl.Collator` por comparación es costoso y usar el locale equivocado cambia el orden entre sesiones.
- **→ Riesgo MEDIO.** Una caché `Map<string, Intl.Collator>` por locale efectivo, con `{ sensitivity: 'base', numeric: true }`; desempate determinista por nombre original y `key`. Verificar con el idioma de la app y con números.

### P5 — Regresión visual y umbral de `truncated`

- El usuario ha cambiado recientemente la apariencia del `TreeFile` y un directorio con exactamente 1000 entradas se marca hoy como parcial.
- **→ Riesgo BAJO.** No tocar el template ni los slots del `TreeFile`; cambiar solo el cálculo a `listed.length > MAX_LIST_ENTRIES` y comprobar los casos 1000/1001 funcionalmente.

### P6 — Coste remoto por symlink

- Cada symlink resuelto añade una petición SFTP de `metadata` dentro del límite de `max_entries`.
- **→ Riesgo BAJO.** Consultar solo para entradas `symlink` con `target` resuelto, ignorar errores como `None` y conservar el tope de entradas existente.

---

## 6. Fases de implementación

> El plan no se ejecutó hasta que el usuario ordenó «Ejecuta el plan» el 2026-11-24. Los pasos marcados como *(manual)* los ejecuta el usuario.

### Fase 1 — Contrato del destino de symlinks y backend sin orden

1. Añadir `targetKind?: 'dir' | 'file' | null` a `FileEntry` en `src/types/fileManager.ts`, con comentario explicando que es opcional y que solo influye en el orden.
2. En `FileManagerPanel.vue::buildLocalEntries`, cuando `item.isSymlink` y el `stat` existente haya tenido éxito, guardar `targetKind: 'dir'` si `info.isDirectory` y `'file'` en caso contrario; si `stat` falla, guardar `null`. Mantener `target: null` y el `kind` actual.
3. Añadir `pub target_kind: Option<String>` a `RemoteEntry` en `src-tauri/src/ssh/types.rs`, documentando los valores `'dir'`/`'file'` y `None` para destino no resoluble.
4. En `src-tauri/src/ssh/list.rs::build_entry`, tras `resolve_symlink_target`, llamar a `sftp.metadata(target)` solo para symlinks con destino resuelto y asignar `target_kind` según `is_dir()`/`is_file()`; cualquier error se traduce a `None` sin romper el listado.
5. Eliminar `entries.sort_by(...)` de `list_level` y la función `kind_rank`; `ssh_list_remote_dir` devuelve las entradas en el orden de llegada de `read_dir`. No crear comandos nuevos ni tocar migraciones.
6. En el mapeo remoto de `FileManagerPanel.vue` (`response.data.entries.map(...)`), copiar `target_kind` a `FileEntry.targetKind` sin transformar el `kind`.
7. *(Manual)* Regenerar `src/types/tauri-types.d.ts` con `cargo test export_bindings`; comprobar que `RemoteEntry` incluye `target_kind` y no editar el archivo generado a mano.

**Estado de la fase: completada** el 2026-11-24. Queda pendiente solo el paso manual 7 y la verificación del usuario.

### Fase 2 — Comparador, índice por clave y ajustes del panel/árbol

1. Crear `src/utils/fileEntries.ts` con `sortFileEntries(entries: readonly FileEntry[], locale?: string): FileEntry[]`: copia del array, rango `0` para directorios y symlinks a directorio, `1` para archivos y symlinks a archivo, `2` para `other` y destinos no resolubles; comparación con `Intl.Collator` cacheado (`sensitivity: 'base'`, `numeric: true`) y desempate por nombre original y `key`. Sin dependencias de Vue ni de Tauri.
2. En `FileTree.vue`, aplicar `sortFileEntries(props.entries, locale.value)` en `treeItems` y `sortFileEntries(loadedChildren ?? [], locale.value)` dentro de `buildNode` antes de mapear los hijos. No modificar iconos, slots, metadatos ni disposición.
3. En `FileTree.vue::formatModified`, sustituir el `new Intl.DateTimeFormat(...)` por una instancia cacheada por locale, conservando `dateStyle: 'short'` y `timeStyle: 'short'`.
4. En `FileManagerPanel.vue`, importar el comparador y ordenar el resultado de `listDirectory` antes de devolverlo, tanto en local como en remoto, de modo que `entries`, `childrenByKey`, el evento `list-loaded` y `persist()` guarden el orden normalizado.
5. En `FileManagerPanel.vue::hydrateFrom`, reordenar `entries` y todos los arrays de `childrenByKey` antes de reasignar las refs; las instantáneas antiguas se corrigen en la primera carga sin migración SQL.
6. Mantener un `Map<string, FileEntry>` interno reconstruido al reemplazar `entries` o `childrenByKey` (listado, hidratación y carga de niveles). `findEntry()` usa `entryIndex.get(key)` y `knownKeys()` devuelve un `Set` a partir de sus claves, sin recorridos completos.
7. Cambiar el cálculo local de `truncated` de `listed.length >= MAX_LIST_ENTRIES` a `listed.length > MAX_LIST_ENTRIES`; el valor remoto sigue viniendo del backend.
8. Verificar que `TransferQueue.vue` no incorpora lógica de ordenación: su detalle hereda el orden del `FileTree` y la ordenación de bloques por `createdAt` queda intacta.
9. Actualizar `AGENTS.frontend.md` §6 con el comparador compartido y `AGENTS.backend.md` §5 con `target_kind`; actualizar `docs/content/es/008.file-manager/` con el criterio de orden y el tratamiento de symlinks. No añadir claves i18n; la versión `en` se traduce solo si el usuario lo confirma.

**Estado de la fase: completada** el 2026-11-24. No se ha ejecutado ninguna comprobación: los criterios de §8 siguen pendientes del usuario.

---

## 7. Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src/types/fileManager.ts` | Campo opcional `targetKind` en `FileEntry`. |
| `src/components/pages/file-manager/FileManagerPanel.vue` | `targetKind` local/remoto, ordenación al listar e hidratar, índice por clave y corrección de `truncated`. |
| `src-tauri/src/ssh/types.rs` | Campo `target_kind` en `RemoteEntry`. |
| `src-tauri/src/ssh/list.rs` | Cálculo de `target_kind` y retirada de `sort_by`/`kind_rank`. |
| `src/types/tauri-types.d.ts` | Regenerado con `cargo test export_bindings`; no editado a mano. |
| `src/utils/fileEntries.ts` (nuevo) | Comparador único con caché de `Intl.Collator` y desempate estable. |
| `src/components/pages/file-manager/FileTree.vue` | Ordenación de entradas e hijos y caché de `Intl.DateTimeFormat`; apariencia intacta. |
| `src/components/pages/file-manager/TransferQueue.vue` | Sin cambios de código; se verifica que consume el orden del `FileTree`. |
| `AGENTS.frontend.md`, `AGENTS.backend.md` | Regla de orden y contrato `target_kind`. |
| `docs/content/es/008.file-manager/` | Criterio de orden y symlinks. |

---

## 8. Verificación y criterios de aceptación

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa. Aquí solo van los pasos funcionales.

- [ ] En el panel local, un directorio con carpetas y archivos mezclados muestra primero las carpetas y después los archivos, con tildes y mayúsculas sin alterar el orden y números en orden natural (`archivo2` antes que `archivo10`).
- [ ] En un host SSH con el mismo contenido, incluidos symlink a carpeta, symlink a archivo y symlink roto, el primero va con las carpetas, el segundo con los archivos y el roto al final, aunque el servidor devuelva las entradas sin ordenar.
- [ ] Una instantánea guardada con el orden anterior se muestra ordenada tras recargar, sin perder selección ni expansión, y la instantánea reescrita ya guarda el orden nuevo.
- [ ] El detalle de una transferencia con archivos en varias carpetas usa el mismo orden, sin cambiar el orden de los bloques por `createdAt`.
- [ ] Al cambiar el idioma de la app, el orden y el formato de fechas siguen las reglas regionales con el mismo formato visible que antes.
- [ ] Tras cargar varios niveles y hidratar instantáneas, seleccionar y deseleccionar entradas sigue funcionando.
- [ ] Un directorio local con exactamente 1000 entradas no muestra el aviso de listado parcial; uno con 1001 sí lo muestra.
- [ ] El clic en el icono de selección, la selección de directorios y la cancelación siguen funcionando igual, y la apariencia del `TreeFile` no ha cambiado.

---

## 9. Desviaciones

- **2026-11-24:** el diseño preveía `metadata.is_dir()` / `metadata.is_file()` en Rust, pero la API real de `russh-sftp 2.3.0` expone `metadata.file_type().is_dir()` / `.is_file()`, tal como ya se usa en `ssh/transfer.rs`. El resultado es el mismo.
- **2026-11-24:** como `src/types/tauri-types.d.ts` es autogenerado y el usuario todavía no ha ejecutado `cargo test export_bindings`, `FileManagerPanel.vue` usa un alias local `RemoteEntryWithTargetKind` para tolerar la ausencia temporal de `target_kind`. No se ha editado el archivo generado; el alias puede retirarse cuando se regenere si se quiere simplificar.
- **2026-11-24:** `rebuildEntryIndex()` se llama también justo después de vaciar `childrenByKey` en `refresh({ preserve: false })`, para que `findEntry()`/`knownKeys()` no consulten un índice con niveles ya descartados mientras llega el nuevo listado.

---

## 10. Puntos abiertos

Ninguno. Las decisiones de alcance, comparador, backend, índice, `truncated` y caché quedaron fijadas en el diseño aprobado y en §4.

---

## 11. Sugerencias (no solicitadas, pendientes de aprobación)

Ninguna en este plan. `FUT-FM-05` (restauración de selección profunda) está en `.agents/AGENTS.futuro.md` y no forma parte de este plan.

---

## 12. Historial de revisiones

- **2026-11-24:** Plan creado en estado **Planificando** a partir del diseño v3 aprobado, con dos fases en un único plan por decisión del usuario. La regeneración de `src/types/tauri-types.d.ts` y las verificaciones quedan como pasos manuales del usuario; no se ha modificado código ni ejecutado comandos de comprobación.
- **2026-11-24:** el usuario ordena «Ejecuta el plan»; se pasa a **Ejecutando** y se inicia la fase 1.
- **2026-11-24:** fase 1 completada: `FileEntry.targetKind`, `RemoteEntry.target_kind`, cálculo remoto con `sftp.metadata()` y retirada de `sort_by`/`kind_rank`. El panel local y el remoto ya trasladan el dato sin cambiar `kind` ni permisos.
- **2026-11-24:** fase 2 completada: `src/utils/fileEntries.ts` con collator cacheado, ordenación en `FileTree` y `FileManagerPanel`, hidratación normalizada, índice por clave, corrección de `truncated` y caché de fechas. `TransferQueue.vue` no se ha tocado: consume el orden del árbol. Se actualizan `AGENTS.frontend.md`, `AGENTS.backend.md` y `docs/content/es/008.file-manager/` (navegación y cola).
- **2026-11-24:** el plan sigue **Ejecutando** a la espera de que el usuario ejecute el generador de tipos y confirme los criterios de §8. No se han ejecutado comprobaciones de tipos, build ni `cargo check`.
- **2026-11-25:** el usuario confirma «todo ok» y pide cerrar el plan y el diseño; se marca **Terminado**, se archiva en `.agents/.done/plans/` y el diseño pasa a **Implementado** en `.agents/.done/designs/`.
