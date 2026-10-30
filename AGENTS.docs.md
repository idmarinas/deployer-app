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

## Convenciones técnicas

- **Frontmatter**: `title` y `description` breves y con valor. Usar `{{project_name}}` en la description (nunca hardcodear el nombre). Valores con `:` o caracteres especiales van entre **comillas simples** (`description: '...'`). Usar `since: '<versión>'` cuando el módulo exista desde una versión concreta y `navigation.icon` (`i-tabler-*`).
- **Prefijos numéricos**: solo en el **nombre de archivo** para ordenar; la URL los ignora. En los enlaces **nunca** se incluyen (`./manage`, `./copy-to-server`, `/hosts`). Anclas `#nombre-seccion` para subsecciones de la misma página.
- **Markdown**: peso `**negrita**` para los términos a resaltar; guion largo `—` como separador en bullets; bloques MDC `::note`/`::warning` siempre balanceados; fences de código cerrados.
- **Idioma**: región neutra; siempre español en `es`.
