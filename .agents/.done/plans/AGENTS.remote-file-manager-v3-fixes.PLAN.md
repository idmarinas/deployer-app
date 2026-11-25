# Plan: Corrección de errores del gestor de archivos remoto v3

> **Estado: Terminado** — el usuario pidió darlo por finalizado el 2026-11-25.
>
> **Diseño de origen:** ninguno (correcciones sobre la implementación del plan archivado `.agents/.done/plans/AGENTS.remote-file-manager-v3.PLAN.md`).
>
> **Última revisión:** 2026-11-25 — cierre del plan tras aplicar las correcciones; la verificación de §8 queda pendiente del usuario. Historial completo al final (§12).

---

## 1. Instrucciones dadas (verbatim)

> ".agents\.done\plans\AGENTS.remote-file-manager-v3.PLAN.md"
>
> "Hay que corregir errores encontrados, cuando se implemento este plan."
>
> "Te los indico yo, pero agrega tu los que has encontrado."
>
> "Crea un plan con tu última respuesta."

---

## 2. Objetivo y alcance

Corregir los errores detectados al revisar la implementación del plan v3, tanto en el comportamiento del gestor de archivos como en la documentación y las convenciones de código, sin deshacer el orden ni las decisiones ya verificadas de ese plan.

**Incluido en este plan:** los doce hallazgos de la revisión previa y del usuario:

1. «Actualizar» pierde la selección del panel.
2. Carrera de navegación: un listado antiguo puede mostrarse y persistirse bajo la ruta nueva.
3. `truncated` es global y se sobrescribe al cargar niveles hijos.
4. «Restablecer ruta» no recarga cuando la ruta base coincide con la actual.
5. Botón «Abrir carpeta» con habilitación incorrecta: activo para archivos en los paneles y para carpetas en la cola (`readOnly`).
6. Marca de tiempo `0` mostrada como ausente.
7. Documentación de la cola: tamaños disponibles «pendientes» (afirmación falsa).
8. Documentación de navegación: chevron que ya no se renderiza.
9. Iconos literales `i-tabler-*` en componentes del gestor.
10. Campo `fileIcon` calculado y sin uso en `FileTree.vue`.
11. Al seleccionar una carpeta con subcarpetas, el indicador de carga desaparece cuando termina su propio nivel, aunque `ensureLoadedRecursively()` siga cargando los descendientes (hallazgo aportado por el usuario).
12. Los directorios hijos cuyo listado se recorta no muestran aviso propio: el único indicador es el párrafo global «Listado parcial» sobre el árbol (`FileTree.vue:289-292`).

**Fuera de alcance:** ninguna indicada por el usuario para este plan. El plan y el diseño v3 archivados no se reabren ni se modifican en su alcance ni en sus decisiones (comparador único, `targetKind`, backend sin orden); solo se añade la nota de historial del paso 15.

---

## 3. Contexto técnico actual

- **Panel:** `FileManagerPanel.vue::refresh()` (líneas 283-303) vacía `childrenByKey`, `loadedKeys`, `loadingKeys` y `expandedKeys`, y llama a `treeRef.reset()` antes de listar. `FileTree.vue::reset()` (190-194) también vacía `selected` y emite `update:selected`, que `onSelected()` (363-370) propaga a `selection` y a `persist()`; después, el filtro de claves (301) ya no tiene nada que conservar.
- **Navegación:** `initialize()` (305-321) se corta con `if (initializing) return`, mientras `navigate()` (349-357) ya ha cambiado `currentPath` y emitido `update:path`. `persist()` (255-257) calcula la clave con `scopeKey.value`, que depende de `currentPath`.
- **Listado:** `listDirectory()` (183-237) asigna `truncated.value` tanto en el listado del nivel actual (191, 226) como en el de los hijos que pide `loadChildren()` (337). `FileTree.vue` muestra un único aviso global (289-292); los niveles hijos no tienen indicador propio.
- **Restablecer ruta:** `resetRemotePath()` (400-408) borra preferencia e instantánea y delega en `navigate(path, { discard: true })`; `navigate()` sale temprano si `next === currentPath.value`.
- **Árbol:** `FileTree.vue:362` calcula el `disabled` del botón «Abrir carpeta» como `!(kind === 'dir') && readOnly`: con `readOnly=false` (paneles) el botón está activo también para archivos, y con `readOnly=true` (cola, `TransferQueue.vue:233-239`) lo está para carpetas, aunque allí no haya handler de `activate`.
- **Carga:** `FileTree.vue::onIconClick()` (256-263) espera a `ensureLoadedRecursively()`, pero el icono giratorio del botón de selección (327-332) depende solo de `loadingKeys.includes(key)`: al terminar el nivel propio, la clave sale de `loadingKeys` aunque queden subcarpetas por cargar.
- **Fechas:** `FileTree.vue::formatModified()` (112-115) usa `if (!seconds) return '—'`.
- **Documentación:** `docs/content/es/008.file-manager/1.navigation.md:14,33,43` y `3.queue.md:14` describen el estado actual del gestor. En `useSshJobs.ts:472-491`, `job.files` se rellena con el evento `file_list`, que llega después de `item_started`, no en `pending`.
- **Iconos:** `src/utils/icons.ts` expone `ICONS`; `FileTree.vue:345` y `TransferQueue.vue:222-223` usan literales `i-tabler-*`, en contra de `AGENTS.frontend.md` §8.

Contexto aportado por el agente (análisis previo):

- El plan v3 se cerró y archivó el 2026-11-25; los `fix` visuales de `FileTree.vue` de ese mismo día son cambios del usuario y no se revierten.
- El slot `#item` de `FileTree.vue` sustituye el render por defecto de `UTree`, incluido su chevron; el botón propio se eliminó en el commit `860b93b`. El usuario confirma que la carpeta se expande pulsando el nombre (la fila), como antes de añadir ese botón.
- La ordenación, el cálculo de `targetKind` y la hidratación ordenada se han revisado y **no** presentan fallos: no deben tocarse.
- Los diez primeros hallazgos son de revisión estática; el undécimo lo aportó el usuario. No se han ejecutado comprobaciones de tipos, build ni tests.

---

## 4. Decisiones

| Fecha | Decisión | De quién |
| --- | --- | --- |
| 2026-11-25 | Corregir los errores encontrados en la implementación del plan v3. | usuario |
| 2026-11-25 | El usuario aporta su error vía `MC c5` (indicador de carga incompleto) y se incorpora como hallazgo 11. | usuario |
| 2026-11-25 | Crear un plan correctivo nuevo en **Planificando**, sin reabrir el plan ni el diseño v3 archivados. | agente (según `plan-workflow`) |
| 2026-11-25 | Tomar como alcance los diez hallazgos de la última respuesta del agente más el del usuario, agrupados en dos fases. | agente, a petición del usuario |
| 2026-11-25 | Mantener y arreglar el hallazgo 5 del botón «Abrir carpeta» (`MC c1`). | usuario |
| 2026-11-25 | La carpeta se expande pulsando el nombre (la fila); se documenta así y no se reintroduce el chevron (`MC c4`). | usuario |
| 2026-11-25 | La sugerencia de `truncated` por directorio se aclara primero (`MC c2`) y después pasa al plan como hallazgo 12 (`MC` de §11, id `c1`). | usuario |
| 2026-11-25 | Las pruebas unitarias se registran en `.agents/AGENTS.futuro.md` como `FUT-FM-06`, fuera de este plan (`MC c3`). | usuario |
| 2026-11-25 | Corregir la carrera de navegación relanzando la carga de la última ruta, no solo descartando la obsoleta. | agente (revisión del plan) |
| 2026-11-25 | El plan v3 archivado solo recibe una nota de historial; no se alteran su alcance ni sus decisiones. | agente (revisión del plan) |

**Alternativas descartadas:** reabrir o editar el plan v3 archivado; arreglar el código sin plan previo; revertir los cambios visuales del `TreeFile` de los commits del 25-nov; modificar el comparador, `targetKind` o el contrato Rust; añadir claves i18n.

---

## 5. Problemas y riesgos

### P1 — Reactividad y selección (hallazgo 1)

- `reset()` emite `update:selected` y vacía `selection` antes de filtrar, y los nodos seleccionados siguen apuntando a entradas del listado anterior aunque no cambien las claves.
- **→ Riesgo MEDIO.** Separar el reinicio de navegación del de selección y volver a resolver las claves seleccionadas contra el nuevo `treeItems` cuando cambie el listado.

### P2 — Concurrencia de navegación (hallazgo 2)

- Varias cargas pueden solaparse: `initialize()` descarta la segunda petición, pero la primera escribe entradas y persiste con la clave de la ruta ya cambiada.
- **→ Riesgo MEDIO.** Un token de generación que invalide resultados obsoletos antes de asignar `entries`, emitir la ruta o persistir, y persistir con la ruta capturada al listar.

### P3 — Estado por nivel (hallazgo 3)

- `truncated` es un único `ref` para todo el panel y `loadChildren()` lo sobrescribe con el valor del hijo.
- **→ Riesgo BAJO.** `listDirectory()` devuelve entradas y flag; solo `refresh()` actualiza el flag del nivel actual.

### P4 — Acciones y robustez (hallazgos 4, 5, 6)

- «Restablecer ruta» puede no recargar; el botón «Abrir carpeta» está activo donde no corresponde (archivos en paneles, carpetas en la cola); un timestamp `0` se muestra como ausente.
- **→ Riesgo BAJO.** Forzar el refresco cuando la ruta no cambia, corregir la condición de `disabled` y comprobar `null` en lugar de falsedad.

### P5 — Documentación y convenciones (hallazgos 7-10)

- Dos afirmaciones de la documentación no coinciden con el código, hay iconos literales y un campo de nodo sin uso.
- **→ Riesgo BAJO.** Corregir los textos contra el código, centralizar los iconos en `ICONS` y eliminar el campo muerto. El usuario confirma que la expansión se hace pulsando el nombre de la carpeta.

### P6 — Indicador de carga incompleto (hallazgo 11)

- `loadingKeys` solo contiene la clave del nivel que se está listando en ese instante; al pasar a los descendientes, el botón de selección deja de mostrar el icono giratorio aunque la selección aún no esté completa.
- **→ Riesgo MEDIO.** Mantener un estado propio de «selección en carga» mientras dura `ensureLoadedRecursively()` y usarlo también en el `disabled` y en el icono del botón de selección; verificar con una carpeta con varios niveles.

### P7 — Truncado invisible en niveles hijos (hallazgo 12)

- `truncated` es un único flag global: al expandir un subdirectorio recortado no hay aviso junto a esa carpeta; el párrafo «Listado parcial» solo describe el nivel actual.
- **→ Riesgo BAJO.** Guardar el flag por clave de directorio en el panel, pasarlo a `FileTree` y mostrar el aviso en la fila de cada carpeta afectada, reutilizando el texto i18n existente.

---

## 6. Fases de implementación

> El plan NO se ejecuta hasta que el usuario lo pase a **Pendiente**.

### Fase 1 — Correcciones funcionales del panel y del árbol

1. En `FileTree.vue`, separar `reset()` en `reset()` (selección, expansión y avisos) y un método nuevo de reinicio de navegación que limpie expansión y avisos sin tocar `selected`; exponerlo con `defineExpose`.
2. En `FileTree.vue`, volver a resolver la selección cuando cambie `treeItems` (mismo criterio que `applyInitialSelection`, con la guarda `sameKeys` para no repetir emisiones), para que los nodos seleccionados apunten a las entradas del listado nuevo.
3. En `FileManagerPanel.vue::refresh()`, usar el nuevo reinicio de navegación en lugar de `reset()`, dejando que el filtro de claves existente retire solo las entradas desaparecidas.
4. En `FileManagerPanel.vue`, sustituir la guarda `initializing` por un token de generación: incrementarlo al inicio de `navigate()` y de `initialize()`, capturarlo antes de cada `await` y descartar el resultado si cambió (no asignar `entries`, no emitir `update:path` y no persistir). Si llega otra navegación mientras una carga sigue en curso, relanzar `initialize()` con la última ruta. Capturar la ruta listada para persistir bajo su propia clave.
5. En `FileManagerPanel.vue`, cambiar `listDirectory()` para devolver `{ entries, truncated } | null`; asignar `truncated.value` solo desde `refresh()` y no desde `loadChildren()`. En `loadChildren()`, guardar el flag devuelto en `truncatedByKey[key]` (estado en memoria; sin tocar el esquema de instantáneas).
6. En `FileManagerPanel.vue::resetRemotePath()`, forzar `refresh({ preserve: false })` (o añadir `force` a `navigate()`) cuando la ruta base calculada sea igual a la actual, sin volver a guardar la instantánea borrada.
7. En `FileTree.vue:362`, cambiar el `disabled` del botón «Abrir carpeta» a `entry.kind !== 'dir' || readOnly` (el usuario confirma mantener y corregir este hallazgo).
8. En `FileTree.vue::formatModified()`, devolver `'—'` solo con `seconds === null`.
9. En `FileTree.vue`, mantener un estado propio de «selección en carga» (`selectionLoadingKey` o equivalente) en `onIconClick()` mientras espera a `ensureLoadedRecursively()`, limpiándolo en un `finally` aunque falle la carga; usarlo junto con `loadingKeys` en el `disabled` y en el icono giratorio del **botón de selección** (no del de «Abrir carpeta», corregido en el paso 7) para que el indicador no desaparezca hasta que terminen todas las subcarpetas.
10. En `FileTree.vue`, añadir la prop `truncatedByKey` y mostrar un aviso «Listado parcial» junto al nombre de cada carpeta cuyo flag esté a `true`, reutilizando `components.file_manager.entry.partial` (sin claves i18n nuevas). En `FileManagerPanel.vue`, pasar la prop y vaciar `truncatedByKey` cuando `refresh({ preserve: false })` descarte los niveles cargados.

### Fase 2 — Documentación y convenciones

11. En `docs/content/es/008.file-manager/3.queue.md:14`, sustituir la afirmación sobre los tamaños en trabajos pendientes por «en cuanto empieza cada ítem (evento `file_list`)», coherente con `useSshJobs.ts`.
12. En `docs/content/es/008.file-manager/1.navigation.md:33`, sustituir la descripción del chevron por «la carpeta se expande o contrae haciendo clic en su nombre (la fila)»; verificar que el texto de «Estado que se recuerda» (línea 14) siga siendo válido tras el paso 3 y ajustarlo solo si el comportamiento corregido difiere.
13. Añadir a `ICONS` (`src/utils/icons.ts`) las flechas que faltan y sustituir los literales `i-tabler-arrow-narrow-right`, `i-tabler-arrow-narrow-down-dashed` y `i-tabler-arrow-narrow-right-dashed` en `FileTree.vue` y `TransferQueue.vue` (§8 de `AGENTS.frontend.md`).
14. Eliminar `fileIcon` de `FileTreeNode` y su cálculo en `buildNode()` (`FileTree.vue:20,105`), ajustando el comentario asociado; `getEntryIcon()` sigue en uso en `selectionIcon()`.
15. Registrar en el plan v3 archivado únicamente una nota de historial que apunte a este plan correctivo; no modificar su alcance ni sus decisiones.

---

## 7. Archivos afectados

| Archivo | Cambio previsto |
| --- | --- |
| `src/components/pages/file-manager/FileTree.vue` | Reinicio sin selección, re-resolución de nodos, `disabled` del botón, indicador de carga de subcarpetas, aviso de truncado por carpeta, timestamp `0`, iconos e `fileIcon`. |
| `src/components/pages/file-manager/FileManagerPanel.vue` | Token de navegación, persistencia por ruta, `truncated` y `truncatedByKey` por directorio, y refresco forzado en «Restablecer ruta». |
| `src/components/pages/file-manager/TransferQueue.vue` | Iconos de flecha desde `ICONS`. |
| `src/utils/icons.ts` | Nuevas claves de flechas estrechas discontinuas/normales. |
| `docs/content/es/008.file-manager/1.navigation.md` | Texto de selección y expansión. |
| `docs/content/es/008.file-manager/3.queue.md` | Momento en que aparecen los tamaños del detalle. |
| `.agents/.done/plans/AGENTS.remote-file-manager-v3.PLAN.md` | Nota de historial que enlaza este plan (sin cambios de alcance). |
| `.agents/AGENTS.futuro.md` | Bloque `FUT-FM-06` ya registrado en la revisión; sin cambios pendientes. |

---

## 8. Verificación y criterios de aceptación

> La hace el usuario; el agente no ejecuta comprobaciones salvo petición expresa.

- [ ] Seleccionar archivos en los dos paneles y pulsar **Actualizar**: la selección sigue marcada si las entradas siguen existiendo, y solo se retira lo que desapareció.
- [ ] Cambiar de ruta varias veces rápidamente (breadcrumb y botón «Abrir carpeta»): el contenido mostrado y la instantánea guardada corresponden siempre a la ruta activa.
- [ ] Con un directorio raíz de más de 1000 entradas, expandir un subdirectorio pequeño no quita el aviso global «Listado parcial»; el caso inverso no lo añade al nivel actual.
- [ ] Al expandir un subdirectorio con más de 1000 entradas aparece «Listado parcial» junto a esa carpeta; al expandir otro pequeño no aparece junto a él.
- [ ] Pulsar **Restablecer ruta** cuando la ruta actual ya es la base: se recarga el listado y se descarta la instantánea anterior.
- [ ] En el detalle de la cola el botón «Abrir carpeta» está deshabilitado; en los paneles sigue activo solo para directorios.
- [ ] Al marcar una carpeta con varias capas de subcarpetas, el icono de carga permanece hasta que se ha cargado el último nivel y la selección se completa entonces.
- [ ] Una entrada con fecha `1970-01-01 00:00:00` muestra la fecha, no «—».
- [ ] La documentación en `es` describe la expansión y el momento en que aparecen los tamaños tal como se observa en la app.
- [ ] No quedan literales `i-tabler-*` nuevos en los componentes del gestor ni código muerto `fileIcon`.

---

## 9. Desviaciones

- **Paso 2:** se añadió `reResolveSelection()` en lugar de llamar directamente a `applyInitialSelection()` desde el `watch(treeItems)`. La guarda `sameKeys` de `applyInitialSelection` habría impedido renovar los nodos cuando las claves no cambian, que es justo el hallazgo 1. `onSelected()` del panel acepta ahora listas con las mismas claves pero entradas nuevas, para que no se conserven objetos obsoletos.
- **Paso 4:** se eliminó la guarda `initializing` y cada `navigate()` lanza su propia `initialize()`; el token de generación garantiza que solo la última carga escriba `entries`, emita la ruta y persista. Es la forma elegida de «relanzar con la última ruta».
- **Paso 5/10:** `truncatedByKey` se mantiene solo en memoria; no se ha ampliado el esquema de instantáneas.
- La verificación de §8 no la ejecuta el agente: queda para el usuario.

---

## 10. Puntos abiertos

Ninguno.

---

## 11. Sugerencias (no solicitadas, pendientes de aprobación)

Ninguna pendiente. La sugerencia de `truncated` por directorio se ha incorporado como hallazgo 12 y paso 10: el único aviso visible era el párrafo «Listado parcial» sobre el árbol (`FileTree.vue:289-292`), dependiente del prop `truncated` del panel, y los niveles hijos no tenían indicador propio.

Las pruebas unitarias de `sortFileEntries()` y de la re-resolución de selección no están aquí: el usuario las ha movido a `.agents/AGENTS.futuro.md` como `FUT-FM-06`.

---

## 12. Historial de revisiones

- **2026-11-25:** Plan creado en estado **Planificando** con los diez hallazgos de la revisión del gestor, a petición del usuario, en dos fases: correcciones funcionales y documentación/convenciones.
- **2026-11-25:** Se atienden los comentarios `MC c1`–`c5`: se mantiene el hallazgo del botón «Abrir carpeta», se incorpora el error de carga de subcarpetas aportado por el usuario (hallazgo 11), se documenta la expansión por clic en el nombre, se aclara la sugerencia de `truncated` y se trasladan las pruebas unitarias al backlog como `FUT-FM-06`. El plan sigue en **Planificando**.
- **2026-11-25:** Revisión del plan: se atiende el `MC` de §11 (id `c1`, reutilizado) promoviendo la sugerencia de `truncated` por directorio a hallazgo 12 y paso 10; se corrige la carrera de navegación para relanzar la carga de la última ruta, se aclara el paso 9 y se resuelve la contradicción sobre editar el plan archivado. Sigue en **Planificando**.
- **2026-11-25:** El usuario pide aplicar el plan; pasa a **Ejecutando**.
- **2026-11-25:** Fases 1 y 2 ejecutadas: correcciones en `FileTree.vue`, `FileManagerPanel.vue`, `TransferQueue.vue` e `ICONS`, textos de `es`, y nota en el plan v3 archivado. Sin comprobaciones de tipos/build/tests; pendiente de verificación del usuario.
- **2026-11-25:** el usuario pide dar el plan por finalizado; se marca **Terminado**, se archiva en `.agents/.done/plans/`, se añade la entrada de cierre al historial y se elimina su referencia de `AGENTS.todo.md`. La verificación de §8 sigue pendiente del usuario.
