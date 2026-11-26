# DeployerApp — Guía de documentación

Guía para redactar la documentación de usuario de la aplicación en `docs/content/`.

## Habilidades (Skills)

- Usar las siguientes habilidades disponibles para crear/actualizar la documentación:
    - create-docs
    - review-docs
    - documentation

## Proceso

- Se redacta primero el locale **es** (`docs/content/es/`).
- Cuando el usuario lo confirme se traduccirá las partes que elija cuando se hayan revisado.
- El gestor de archivos de doble panel vive en `008.file-manager/` (navegación, transferencias y cola); solo en `es` hasta confirmación.
- En los changelog, **es** es siempre la fuente de verdad: tras revisar la versión en `es` se replica en todos los locales; cualquier cambio posterior se propaga a todos (ver [Changelog](#changelog)).

## Fuente de verdad: el código

- **Toda afirmación debe verificarse contra el código**: componentes Vue (`src/components/`, `src/pages/`), formularios y diálogos, comandos Rust (`src-tauri/src/commands/`) y las cadenas de UI en `src/locales/{es,en}/`. Está prohibido inventar o suponer comportamiento.
- Si un comportamiento no se puede confirmar en el código, no se documenta o se pregunta al usuario en lugar de suponerlo.

## Umbral anti-obviedad

- **No transcribir** etiquetas, botones ni campos que el UI ya muestra ("pulsa Guardar", "rellena el nombre", "hay un botón X").
- Documentar solo lo **no evidente**.
- Cada página debe aportar **al menos un dato no trivial**. Si una página no aporta ninguno, se **fusiona** en otra o se elimina.
- Los matices suelen encajar en bloques `::note` / `::warning` breves (MDC), no en párrafos largos.

## Estructura por tipo de página

- **Overview** (`1.overview.md`): qué es el módulo, dominio (tipos/datos), seguridad/almacenamiento si aplica. **Sin** sección "A continuación" (el nav ya enlaza anterior/siguiente).
- **Páginas de uso** (`2.manage.md`, acciones...): pasos orientados a **resultado** (qué lograr y qué ocurre), seguidos de comportamientos, restricciones y errores relevantes. No enumerar campos del formulario.
- Una acción subalterna solo es página propia si tiene contenido no trivial; si no, se documenta como subsección (`##`) de su página de uso.

## Changelog

- **Plantilla**: `.agents/references/changelog.md`. De ahí se toman el frontmatter, el orden de secciones y el formato de las entradas; no se inventan secciones nuevas.
- **Fuente de verdad**: `es`. Se escribe primero en `docs/content/es/.changelog/` y después se replica en el resto de locales. Todos los changelog de una versión deben tener el **mismo frontmatter** (`version`, `branch`, `date`, `authors`), las **mismas secciones**, el **mismo número de entradas** y la **misma lista de commits**. Solo se traducen `title`, `description`, los títulos de sección y las etiquetas de UI.
- **Estructura de carpetas** (idéntica en cada locale, no hace falta volver a analizarla):

```text
docs/content/<locale>/.changelog/
├── index.yaml                  # índice general del historial
├── <rama>/
│   ├── index.yaml              # índice de la línea de versiones
│   └── <versión>.md            # una página por release, p. ej. 0.3.0.md
└── ...
```

- Las ramas agrupan releases por línea (`0.1.x`, `0.2.x`, `0.3.x`, ...). El directorio, el campo `branch` del frontmatter y el `branch` del `index.yaml` de la rama deben coincidir; el nombre del archivo debe coincidir con `version`.
- **Frontmatter del release**: `version`, `branch`, `date` (`yyyy-mm-dd`), `title`, `description` (con `{{project_name}}`, nunca el nombre hardcodeado) y `authors`. Ejemplo: `version: '0.3.0'`, `branch: '0.3.x'`.
- **Secciones**, en el orden de la plantilla y omitiendo las que no apliquen: *Release highlights* / **Destacados de la versión**, *Added* / **Añadido**, *Changed* / **Cambios**, *Deprecated* / **Obsoleto**, *Fixed* / **Correcciones**, *Security* / **Seguridad** y *Breaking changes* / **Cambios incompatibles**. En `en` se usan los títulos en inglés de la plantilla.
- **Entradas**: en *Destacados* se usa `- **Funcionalidad**: resumen.`; en el resto de secciones cada viñeta empieza por un verbo (`Añade`, `Corrige`, `Mejora`...). Cada entrada lleva sus referencias a commits con el formato ``([`abcdef1`](https://github.com/idmarinas/deployer-app/commit/abcdef1))`` y, si procede, el autor ``([@usuario](https://github.com/usuario))``. Los commits citados deben verificarse con `git log` y ser idénticos en todos los idiomas.
- **Correcciones**: solo incluir arreglos de problemas que ya existían en la versión anterior; **nunca** correcciones de código introducido en la versión que se está documentando.
- **Contenido**: no mencionar migraciones ni tablas de la base de datos; describir el módulo o la funcionalidad añadida o cambiada y su efecto visible.
- **Índices**: el `index.yaml` raíz solo contiene `title` y `description`. El `index.yaml` de cada rama contiene `branch`, `title`, `description`, `security` (si recibe actualizaciones de seguridad), `requirements.op` (sistemas operativos) y `support` (`features` | `bugs` | `none`). Sus **valores** se sincronizan entre locales; los comentarios se escriben en el idioma de cada locale. Si una rama deja de estar activa, actualizar `security` y `support` en todos.
- **Verificación final**: comparar entre `es` y los demás locales los metadatos, el número de secciones y entradas, y la lista de commits antes de dar por terminado el changelog.

## Convenciones técnicas

- **Frontmatter**: `title` y `description` breves y con valor. Usar `{{project_name}}` en la description (nunca hardcodear el nombre). Valores con `:` o caracteres especiales van entre **comillas simples** (`description: '...'`). Usar `since: '<versión>'` cuando el módulo exista desde una versión concreta y `navigation.icon` (`i-tabler-*`).
- **Prefijos numéricos**: solo en el **nombre de archivo** para ordenar; la URL los ignora. En los enlaces **nunca** se incluyen (`./manage`, `./copy-to-server`, `/hosts`). Anclas `#nombre-seccion` para subsecciones de la misma página.
- **Markdown**: peso `**negrita**` para los términos a resaltar; guion largo `—` como separador en bullets; bloques MDC `::note`/`::warning` siempre balanceados; fences de código cerrados.
- **Idioma**: región neutra; siempre español en `es`.
