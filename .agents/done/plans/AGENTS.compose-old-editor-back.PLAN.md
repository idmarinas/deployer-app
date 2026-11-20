# Plan — Separar componentes del editor antiguo de compose (extensión `.back`)

> Tarea del usuario (13 ago 2026): separar los componentes del antiguo editor del compose del nuevo; a los componentes del antiguo editor (y que no se usen) agregarles la extensión `.back`.
> Estado: **COMPLETADA**.
> Este archivo hace de historial y registra todos los cambios hechos.

## 1. Problema

`src/components/form/inputs/docker-compose/` mezcla el editor visual antiguo de compose con componentes que sí se usan (el picker de imágenes para el nuevo editor de schema, y el flujo de subida de archivos). El editor antiguo quedó huérfano: `ComposeTopLevelSection` y `ComposeServicesSection` no se referencian en ningún sitio del `src/` vivo, `ComposeServiceFields` solo lo usa `ComposeServicesSection`, y los 6 editores de campos solo los usa `ComposeServiceFields`. Seguían escaneados por el auto-import (unplugin-vue-components) y listados en `components.d.ts` aunque fueran código muerto.

## 2. Solución

Renombrar los 9 componentes huérfanos añadiendo la extensión `.back` (`X.vue` → `X.vue.back`). Al no terminar en `.vue`, unplugin-vue-components deja de escanearlos: desaparecen del auto-import y de `components.d.ts` sin romper nada (nada vivo los importa; los usos entre hermanos van por auto-import, no por imports relativos).

## 3. Renombrados (`src/components/form/inputs/docker-compose/`)

- `ComposeTopLevelSection.vue` → `.vue.back`
- `ComposeServicesSection.vue` → `.vue.back`
- `ComposeServiceFields.vue` → `.vue.back`
- `ComposePortEditor.vue` → `.vue.back`
- `ComposeVolumeMountEditor.vue` → `.vue.back`
- `ComposeEnvironmentEditor.vue` → `.vue.back`
- `ComposeLabelsEditor.vue` → `.vue.back`
- `ComposeHealthcheckFields.vue` → `.vue.back`
- `ComposeDeployFields.vue` → `.vue.back`

## 4. Se quedan (en uso)

- `ComposeImagePicker.vue` — lo usa el nuevo `ComposeEditor.vue` (schema).
- `DockerComposeTreeFilePicker.vue` + `ComposeTreeFilesUpload.vue` — los usa `DockerComposeForm.vue` (flujo add/edit de docker compose).
- `DockerComposeForm.vue` (en `src/components/form/`).

## 5. No tocados

- `_archived.dist/` (prohibido por AGENTS) — ahí vive una copia del editor antiguo completo (`ComposeFormEditor.vue`), de referencia.
- Libs (`src/lib/docker-compose/parser.ts`, `types.ts`, …) — el usuario pidió solo componentes.

## 6. Verificación

- grep en `src/` (`*.vue`/`*.ts`): sin referencias vivas a los 9 nombres.
- `bun test` → 92/92.
- `bunx vue-tsc --noEmit` → limpio.
- `bun run build` → verde; `components.d.ts` regenerado sin los 9 (quedan `ComposeImagePicker`, `ComposeTreeFilesUpload`, `DockerComposeTreeFilePicker`).

## 7. Archivos

- 9 renames en `src/components/form/inputs/docker-compose/`.
- Docs: `AGENTS.compose-old-editor-back.PLAN.md`, `AGENTS.todo.done.md`.

## 8. Reglas

- Idioma español. Sin cambios de código, sin dependencias, sin i18n, sin migraciones.
