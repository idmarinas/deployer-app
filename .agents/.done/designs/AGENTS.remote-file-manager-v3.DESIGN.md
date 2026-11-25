# Diseño: Gestor de archivos remoto — v3 (orden del `TreeFile`)

> **Estado: Implementado** el 2026-11-25 (Propuesta → Aprobado → Implementado; solo el usuario cambia el estado).
> **Diseño de origen:** `.agents/.done/designs/AGENTS.remote-file-manager-v2.DESIGN.md`
> **Última revisión:** 2026-11-25 — el usuario confirma la verificación; el diseño y su plan se archivan como implementados. Historial completo al final (§12).
> **Revisión (2026-11-24):** comentarios `c1`–`c7` atendidos; se conservan los cambios visuales del `TreeFile` hechos por el usuario. El usuario aprueba el diseño y elige un único plan con dos fases.
>
> Este documento **no es un plan** y **no modifica** `AGENTS.todo.md`. El plan derivado está en `.agents/.done/plans/AGENTS.remote-file-manager-v3.PLAN.md`, en estado **Terminado**.

---

## 1. Tarea original (verbatim)

> Vamos a mejorar este diseño .agents\.done\designs\AGENTS.remote-file-manager-v2.DESIGN.md
>
> Por ejemplo, el orden de los archivos y directorios cuando se muestran en el TreeFile. Tiene que ser orden alfabético, pero primero son los directorios y luego los archivos.

---

## 2. Objetivo y alcance

Dar al `TreeFile` del gestor un orden **único, determinista y coherente** en los dos paneles, en los niveles hijos, en las instantáneas restauradas y en el detalle de archivos de la cola: primero los directorios, después los archivos, y dentro de cada grupo en orden alfabético según el idioma de la app. Los symlinks se colocan según el tipo de su destino.

**Incluido en esta versión:**

- Un comparador compartido en el frontend (`src/utils/fileEntries.ts`) que decide el grupo y el orden alfabético natural, sin distinguir tildes ni mayúsculas; `FileTree` lo aplica siempre a `entries` y a cada nivel de `childrenByKey`.
- Ordenación también en `FileManagerPanel.vue` al listar y al hidratar instantáneas antiguas, para que lo guardado en SQLite ya esté normalizado.
- Información del destino de los symlinks: `FileEntry.targetKind` en el frontend y `RemoteEntry.target_kind` en el listado remoto existente, sin comandos Rust nuevos ni migraciones SQL.
- Agrupación de symlinks por tipo resuelto: con los directorios si apuntan a directorio, con los archivos si apuntan a archivo y al final si están rotos o no se puede resolver; las entradas `other` también van al final.
- Retirada de la ordenación que hoy hace Rust: `ssh_list_remote_dir` devuelve las entradas en orden de llegada y el frontend impone el único criterio.
- Índice por clave en `FileManagerPanel.vue` para `findEntry()`/`knownKeys()`, corrección del falso aviso de `truncated` en el listado local y caché de `Intl.DateTimeFormat` por idioma.
- Aprovechamiento del mismo orden en `TransferQueue.vue` sin lógica de ordenación propia.

**Fuera de alcance:** no se revierten ni alteran los cambios visuales que el usuario ha hecho en el `TreeFile` (icono de selección, slots, metadatos y disposición). Las decisiones del v2 (persistencia en SQLite, concurrencia, reintento manual, sin escritura remota) siguen vigentes salvo decisión expresa.

Casos de uso iniciales:

- Abrir un directorio con carpetas y archivos mezclados y ver primero todas las carpetas, en orden alfabético, y después todos los archivos.
- Tener un symlink a una carpeta y otro a un archivo y verlos integrados en el grupo que corresponde a su destino.
- Recargar la app con una instantánea guardada antes de este cambio y ver el árbol ordenado sin perder selección ni expansión.
- Abrir el detalle de una transferencia con archivos en rutas anidadas y ver directorios y archivos en el mismo orden que en los paneles.

---

## 3. Conceptos

- **Comparador de entradas**: función pura que recibe `FileEntry[]` y devuelve una copia ordenada; no mutar nunca las props ni el estado de los stores.
- **Rango de orden (`rank`)**: 0 para directorios (incluidos symlinks a directorio), 1 para archivos (incluidos symlinks a archivo) y 2 para entradas `other` y symlinks sin destino resoluble. El grupo 2 se sitúa después de los archivos.
- **Colador por idioma (`Intl.Collator`)**: una instancia cacheada por locale con `sensitivity: 'base'` y `numeric: true`; evita construir un comparador en cada comparación, ignora tildes y mayúsculas y ordena los números de forma natural.
- **`targetKind`**: tipo del destino de un symlink (`'dir' | 'file' | null`). `null` significa «no es symlink» o «destino no resoluble». Es un dato de apoyo al orden, no cambia el `kind` de la entrada ni su comportamiento de transferencia.
- **Índice por clave**: `Map<key, FileEntry>` que mantiene `FileManagerPanel.vue` al listar, cargar niveles e hidratar; sustituye los recorridos completos en `findEntry()` y `knownKeys()`.
- **Instantánea normalizada**: `entries` y `childrenByKey` se guardan ya ordenados; al hidratar se reordenan para absorber instantáneas escritas por versiones anteriores.

---

## 4. Decisiones acordadas

| Fecha      | Decisión                           | Elección y autor                                                                                                    |
| ---------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 2026-11-24 | Mejorar un diseño implementado     | Crear la v3 en `.agents/designs/` con origen en el v2 archivado; no editar ni devolver el v2 a `designs/`; usuario. |
| 2026-11-24 | Alcance inicial                    | El orden de las entradas del `TreeFile`, «por ejemplo»; el usuario añadirá más mejoras a §10; usuario.              |
| 2026-11-24 | Regla de orden                     | Alfabético con directorios primero y archivos después; usuario.                                                     |
| 2026-11-24 | Aplicación de la regla             | Frontend centralizado: un único comparador para paneles, niveles, instantáneas y cola; usuario.                     |
| 2026-11-24 | Symlinks                           | Se ordenan por el tipo de su destino, no por su `kind`; usuario.                                                    |
| 2026-11-24 | Comparación alfabética             | Por idioma, con `localeCompare` / `Intl.Collator`; usuario.                                                         |
| 2026-11-24 | Origen del tipo de destino         | Enriquecer el listado actual: `stat` en local y campo nuevo en la respuesta remota, sin comandos nuevos; usuario.   |
| 2026-11-24 | Destino roto o desconocido         | Al final, tras los archivos; el mismo grupo que las entradas `other`; usuario.                                      |
| 2026-11-24 | Compatibilidad de instantáneas     | Reordenar al hidratar, sin migración SQL ni cambio de esquema; agente.                                              |
| 2026-11-24 | Sensibilidad del comparador        | `sensitivity: 'base'`: sin distinguir tildes ni mayúsculas; usuario (`MC c1`).                                      |
| 2026-11-24 | Orden natural                      | `numeric: true`: `archivo2` antes que `archivo10`; usuario (`MC c3`).                                               |
| 2026-11-24 | Ordenación en el backend           | Eliminar también la ordenación por nombre en Rust; el frontend es la única fuente del orden; usuario (`MC c2`).     |
| 2026-11-24 | Índice por clave                   | Incluir el `Map<key, FileEntry>` en el panel; usuario (`MC c4`).                                                    |
| 2026-11-24 | Aviso `truncated` local            | Corregir el falso positivo cuando hay exactamente `MAX_LIST_ENTRIES`; usuario (`MC c5`).                            |
| 2026-11-24 | Formateo de fechas                 | Cachear `Intl.DateTimeFormat` por locale sin cambiar el formato visible; usuario (`MC c6`).                         |
| 2026-11-24 | Restauración de selección profunda | Trasladar la idea a `.agents/AGENTS.futuro.md` como `FUT-FM-05`; usuario (`MC c7`).                                 |
| 2026-11-24 | Apariencia del `TreeFile`          | Conservar los cambios visuales del usuario: no se revierten iconos, slots, metadatos ni disposición; usuario.       |

**Alternativas descartadas:** modificar el diseño v2 archivado; ordenar en Rust (ni por grupos ni por nombre: el usuario prefiere que el backend no ordene); deducir el destino del symlink por heurística sobre las rutas ya cargadas (falla si el destino está fuera del árbol); comparador sensible a tildes o mayúsculas; orden estrictamente alfabético sin natural; grupo fijo de symlinks entre directorios y archivos; alterar la apariencia actual del `TreeFile`.

---

## 5. Estado actual verificado en el código

| Elemento | Estado real y referencias |
| --- | --- |
| Árbol | `src/components/pages/file-manager/FileTree.vue`: `treeItems` es `props.entries.map(buildNode)` (línea 80), sin ordenación; `buildNode` tampoco ordena `childrenByKey`. Lo consume `FileManagerPanel.vue` y `TransferQueue.vue`. |
| Apariencia del árbol | El `FileTree.vue` actual conserva la selección desde el icono (`selectionIcon`, `#item-leading`), los slots `node-leading-info`/`node-status`/`node-progress`/`node-actions` y el detalle `node-details`. Son cambios visuales del usuario: la v3 no los modifica. |
| Panel local | `FileManagerPanel.vue::buildLocalEntries` usa `readDir` + `stat` y no ordena; `stat` sigue enlaces, pero hoy solo se leen `size`/`mtime`. `truncated` se calcula con `>= MAX_LIST_ENTRIES`. |
| Panel remoto | `ssh_list_remote_dir` ordena en `src-tauri/src/ssh/list.rs::list_level` con `kind_rank` (dir → symlink → file → other) y nombre en minúsculas. `build_entry` resuelve `target` con `canonicalize`/`read_link`, pero `RemoteEntry` (`src-tauri/src/ssh/types.rs`) no informa del tipo del destino. La v3 retira esa ordenación. |
| Instantáneas | `FileManagerPanel.vue::hydrateFrom` copia `entries` y `childrenByKey` tal cual desde SQLite; las instantáneas antiguas conservan cualquier orden previo. |
| Cola | `TransferQueue.vue::buildTree` construye primero los directorios y después los archivos, en orden de llegada de `job.files`; la ordenación de jobs por `createdAt` no afecta al árbol. |
| Tipos | `FileEntry` (`src/types/fileManager.ts`) tiene `kind` y `target`, pero no `targetKind`. `src/types/tauri-types.d.ts` es autogenerado (`cargo test export_bindings`). |
| Permisos | `src-tauri/capabilities/default.json` concede `fs:allow-read-dir` y `fs:allow-stat`; no hay permiso de escritura local. |
| Backend | No existe comando `ssh_stat`; el único listado remoto es `ssh_list_remote_dir`. `cargo check` y la generación de tipos los ejecuta el usuario. |

**Consecuencia:** el orden debe imponerse en el frontend para que cubra local, remoto, datos persistidos y cola; el backend solo necesita añadir un dato al listado que ya existe.

---

## 6. Diseño técnico

### 6.1 Comparador y regla de orden

Nuevo módulo `src/utils/fileEntries.ts` con una única función pública `sortFileEntries(entries: readonly FileEntry[], locale?: string): FileEntry[]`. Devuelve **una copia** (`[...entries].sort(...)`), porque las entradas llegan de props y de stores de Pinia Colada, cuyos `shallowRef` no deben mutarse en profundidad.

- `entryOrderRank(entry)`: `0` si `entry.kind === 'dir'` o si `entry.kind === 'symlink' && entry.targetKind === 'dir'`; `1` si `entry.kind === 'file'` o si `entry.kind === 'symlink' && entry.targetKind === 'file'`; `2` en cualquier otro caso (`other`, symlink roto o `targetKind === null` en una entrada `symlink`).
- Comparación por rango y, dentro del rango, por `collator.compare(a.name, b.name)`. Se usa una caché `Map<string, Intl.Collator>` (clave: locale efectiva; sin locale, la del entorno) con `{ sensitivity: 'base', numeric: true }`: respeta las reglas del idioma, no distingue tildes ni mayúsculas y ordena números de forma natural («archivo2» antes que «archivo10»).
- Desempate determinista por el nombre original (`<`/`>` de código) y después por `entry.key`, solo para que dos nombres que el collator considere equivalentes mantengan un orden estable entre sesiones; no es un criterio de orden semántico. `Array.prototype.sort` es estable en los motores soportados.
- La función es pura, sin dependencias de Vue ni de Tauri; se prueba con entradas de los cuatro `kind` y con `targetKind` nulo.

### 6.2 Tipo del destino de los symlinks

- `src/types/fileManager.ts`: `FileEntry` gana `targetKind?: 'dir' | 'file' | null`. Es opcional para no obligar a rellenarlo en las entradas sintéticas de `TransferQueue.vue`.
- Local (`FileManagerPanel.vue::buildLocalEntries`): cuando `item.isSymlink`, el `stat(path)` que ya se hace sigue el enlace; si `info.isDirectory` es `true`, se guarda `targetKind: 'dir'`, y si no, `'file'`. Si `stat` falla (enlace roto o fuera del scope autorizado), `targetKind: null`. El `target` local sigue como hoy (`null`): no se añade `readLink` ni un permiso nuevo.
- Remoto (`src-tauri/src/ssh/list.rs::build_entry`): tras resolver `target`, se llama a `sftp.metadata(target)` y se guarda `target_kind`: `'dir'` si `metadata.is_dir()`, `'file'` si `metadata.is_file()`, `None` si falla. Solo cuesta una petición SFTP por symlink, dentro del límite de `max_entries`.
- `RemoteEntry` (`src-tauri/src/ssh/types.rs`) gana `target_kind: Option<String>` (valores `'dir'`/`'file'`), exportado con ts-rs. Se regenera `src/types/tauri-types.d.ts` con el flujo del proyecto; no se edita a mano. `FileManagerPanel.vue` copia ese valor a `FileEntry.targetKind`.
- La asignación de `targetKind` **no cambia** el `kind` de la entrada: un symlink a directorio sigue siendo `symlink` y sigue sin desplegarse como directorio; solo cambia su posición en la lista.

### 6.3 Puntos de aplicación

- `FileTree.vue`: `treeItems` pasa por `sortFileEntries(props.entries, locale.value)` y `buildNode` ordena con la misma función los hijos de `childrenByKey[entry.key]`. Así cualquier consumidor (paneles y cola) muestra el orden correcto aunque le lleguen datos sin ordenar. `formatModified` usa un `Intl.DateTimeFormat` cacheado por locale en lugar de crear una instancia por fila; el formato visible no cambia.
- `FileManagerPanel.vue`: `listDirectory` ordena el resultado antes de devolverlo, de modo que `entries`, `childrenByKey`, el evento `list-loaded` y `persist()` guarden el orden normalizado. `hydrateFrom` reordena `entries` y todos los arrays de `childrenByKey` al leer la instantánea; las instantáneas antiguas se corrigen en la primera carga sin migración SQL.
- `FileManagerPanel.vue`: un `Map<key, FileEntry>` se mantiene al listar, cargar niveles e hidratar; `findEntry()` y `knownKeys()` lo consultan en lugar de recorrer `entries` y todos los `childrenByKey`. El mapa se regenera cuando se reemplaza un listado o se añade un nivel.
- `FileManagerPanel.vue`: el aviso local de `truncated` pasa a calcularse con `listed.length > MAX_LIST_ENTRIES` (antes `>=`), para no marcar como parcial un directorio con exactamente 1000 entradas. No se introduce un recorte local nuevo: se conserva el comportamiento visible actual salvo el falso aviso.
- `TransferQueue.vue`: no añade lógica de orden; sus `FileEntry` sintéticos no tienen `targetKind` y entran en el rango 1 (archivos) o 0 (directorios), y el `FileTree` ya los ordena. La ordenación de bloques por `createdAt` queda intacta.
- Se mantiene el orden relativo de selección, expansión y `topLevelEntries()`: la ordenación no altera claves ni rutas, solo la posición de las entradas en el array. La apariencia del `TreeFile` (icono de selección, slots, metadatos y disposición) queda exactamente como la dejó el usuario.

### 6.4 Compatibilidad del backend

- El usuario prefiere que el backend no ordene: se elimina el `sort_by` y el helper `kind_rank` de `src-tauri/src/ssh/list.rs`. `ssh_list_remote_dir` devuelve las entradas en el orden de llegada de `read_dir` y el comparador del frontend es la única fuente del orden. La resolución de `target` para los symlinks se mantiene y se amplía con `target_kind` (§6.2).
- No se crean comandos Rust nuevos, no hay cambios de esquema ni migraciones, y no se añaden claves i18n: el orden es un comportamiento visible sin texto nuevo.

### 6.5 Documentación

- Actualizar `AGENTS.frontend.md` §6 (gestor de archivos) con la regla de orden y el comparador compartido, y `AGENTS.backend.md` §5 con el campo `target_kind` del listado remoto.
- Actualizar `docs/content/es/008.file-manager/` con el criterio de orden y el tratamiento de los symlinks; traducir al `en` solo cuando el usuario lo confirme, según `AGENTS.docs.md`.

---

## 7. Bloques de implementación

> Cada bloque será un plan independiente (`.agents/plans/`) cuando el diseño esté **Aprobado**. Un bloque = un plan.

1. **Contrato del destino de symlinks y backend sin orden** — **Pendiente**: `FileEntry.targetKind`, resolución local con `stat`, `RemoteEntry.target_kind` y su cálculo en `list.rs`, eliminación del `sort_by`/`kind_rank` actual, regeneración de `src/types/tauri-types.d.ts` y verificación de tipos. Plan: pendiente de crear.
2. **Comparador, índice por clave y ajustes del panel/árbol** — **Pendiente**: `src/utils/fileEntries.ts` con caché de `Intl.Collator` (`base` + natural), ordenación en `FileTree` (niveles e hijos) y en `FileManagerPanel` (listado e hidratación), uso por la cola sin lógica propia, `Map<key, FileEntry>`, corrección de `truncated` y caché de `Intl.DateTimeFormat`; actualización de `AGENTS*.md` y docs. Depende del bloque 1. Plan: pendiente de crear.

---

## 8. Verificación prevista

> Orientativa. La verificación la ejecuta el usuario.

- Crear en el panel local un directorio con carpetas y archivos con nombres en mayúsculas, minúsculas, tildes y números (`archivo2`, `archivo10`); comprobar que las carpetas van primero, que las tildes y las mayúsculas no alteran el orden y que los números se ordenan de forma natural dentro de cada grupo.
- Repetir la comprobación en el panel remoto de un host SSH con el mismo contenido, incluidos un symlink a carpeta, un symlink a archivo y un symlink roto; verificar que el primero va con las carpetas, el segundo con los archivos y el roto al final, aunque el servidor devuelva las entradas sin ordenar.
- Guardar una instantánea con el orden anterior, recargar la app y comprobar que el árbol se muestra ordenado sin perder selección ni nodos expandidos; verificar que la instantánea reescrita ya guarda el orden nuevo.
- Abrir una transferencia con archivos en varias carpetas y comprobar que el detalle usa el mismo orden, sin que cambie el orden de los bloques por `createdAt`.
- Cambiar el idioma de la app y comprobar que el orden y el formato de fechas siguen las reglas regionales, con el mismo formato visible que antes.
- Cargar varios niveles, seleccionar y deseleccionar entradas en directorios distintos, y comprobar que la búsqueda interna por clave sigue funcionando después de recargar niveles e hidratar instantáneas.
- Comprobar que un directorio local con exactamente 1000 entradas no muestra el aviso de listado parcial y que uno con 1001 sí lo muestra.
- Comprobar que hacer clic en el icono, seleccionar un directorio y cancelar la selección sigue funcionando igual, y que la apariencia del `TreeFile` no ha cambiado.

---

## 9. Puntos abiertos

No hay decisiones pendientes del usuario. Las preguntas de la propuesta inicial se resolvieron con los comentarios `MC` (§4). El usuario puede añadir más mejoras a §10.

---

## 10. Sugerencias (no solicitadas, pendientes de aprobación)

Ninguna pendiente en este momento. Las cinco ideas de la propuesta inicial ya se han resuelto:

- `SUG-FM-05` (orden natural), `SUG-FM-06` (índice por clave), `SUG-FM-08` (`truncated` local) y `SUG-FM-09` (caché de fechas) se incorporan al alcance de esta v3 (§2 y §6).
- `SUG-FM-07` (restauración de selección profunda) se ha movido a `.agents/AGENTS.futuro.md` como `FUT-FM-05`, sin plan propio todavía.

---

## 11. Diferencias diseño vs implementación

| Tema | Diseño | Implementación |
| --- | --- | --- |
| API de metadatos remotos | `metadata.is_dir()` / `is_file()` | `metadata.file_type().is_dir()` / `.is_file()`, según la API real de `russh-sftp 2.3.0` ya usada en `ssh/transfer.rs`. |
| Tipos generados | `RemoteEntry.target_kind` disponible tras regenerar | Hasta que el usuario ejecuta `cargo test export_bindings`, `FileManagerPanel.vue` usa un alias local para tolerar la ausencia del campo. |
| Índice por clave | Reconstruido al listar, cargar niveles e hidratar | También se reconstruye al vaciar `childrenByKey` en `refresh({ preserve: false })`. |

---

## 12. Historial de revisiones

- **2026-11-24:** propuesta inicial de la v3. Se recoge la petición de ordenar el `TreeFile` (directorios primero y alfabético), se decide aplicarlo con un comparador único en el frontend, ordenar symlinks por el tipo de destino resuelto y situar los no resueltos al final; se añaden cinco sugerencias propias pendientes de aprobación.
- **2026-11-24 (revisión):** se atienden los comentarios `MC c1`–`c7`. El comparador ignora tildes y mayúsculas y usa orden natural; Rust deja de ordenar; se incorporan el índice por clave, la corrección del falso `truncated` local y la caché de fechas; la restauración de selección profunda pasa al backlog como `FUT-FM-05`. Se hace constar que la apariencia actual del `TreeFile` no se revierte.
- **2026-11-24 (aprobación):** el usuario aprueba el diseño y elige un único plan con dos fases; se crea `.agents/plans/AGENTS.remote-file-manager-v3.PLAN.md` en estado **Planificando**.
- **2026-11-24 (implementación):** el usuario ordena ejecutar el plan; se completan las dos fases y se registran las diferencias menores de §11. El plan sigue **Ejecutando** hasta que el usuario regenere tipos y confirme la verificación funcional.
- **2026-11-25 (cierre):** el usuario confirma «todo ok»; el diseño pasa a **Implementado** y se archiva en `.agents/.done/designs/`. El plan derivado queda **Terminado** en `.agents/.done/plans/`.
