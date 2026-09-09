# Plan: Traducción de `locale/es` al inglés (`en`)

## Estado

**Completado** — implementación y verificaciones finalizadas; el usuario dio por cerrado el plan.

---

## Instrucciones dadas (verbatim)

> Extraído de `AGENTS.todo.md` (tarea 1 de `### Tareas`):
>
> 1. Se necesita revisar los archivos de `locale/es` y preparar la traducción al `en`

---

## Resumen

Revisar todos los archivos de mensajes de `src/locales/es/**` y crear su traducción al inglés en `src/locales/en/**`, manteniendo la **misma estructura de archivos y claves** que `es` (el `_loader.ts` y `warnMissingKeys` se basan en `es` como idioma de referencia). Hoy `en/` solo contiene `formats/` (fecha/número); el resto de archivos de mensajes no existen.

## Contexto actual

### Infraestructura i18n (ya lista para `en`)

- `src/locales/_loader.ts` ya tiene `en` en `LOCALE_GLOBS`, `DATETIME_GLOBS` y `NUMBER_GLOBS` (globs de `./en/**/*.ts` excluyendo `en/formats/**`).
- `availableLocales = ['es', 'en']` — los selectores `LocaleChange.vue` y `DeployerAppMenu.vue` ya ofrecen ambos idiomas.
- `src/i18n.ts`: `DEFAULT_LOCALE = navigator.language.split('-')[0]` y `fallbackLocale: DEFAULT_LOCALE`. Si el SO está en inglés, el arranque cargaría `en` vacío (sin mensajes) → hay que completar los mensajes para que la app funcione en inglés de serie.
- `src/composables/useLocale.ts`: carga lazy de mensajes/formats vía `loadLocaleMessages`/`loadDatetimeFormat`/`loadNumberFormat`.
- `typed-locale.d.ts` (autogenerado) solo usa `src/locales/es/**` como fuente de tipos — crear `en` no afecta a los tipos ni requiere tocar `typed-locale.d.ts`.

### Estado actual de `es` (28 archivos de mensajes, además de `formats/`)

```
es/app.ts
es/common.ts
es/entity.ts
es/overlays.ts
es/tauri.ts
es/components/dashboard.ts
es/components/deployerAppMenu.ts
es/components/editor.ts
es/components/empty_list.ts
es/components/error.ts
es/components/navigation.ts
es/components/sidebar.ts
es/dialogs/hosts.ts
es/form/hosts.ts
es/form/index.ts
es/form/passkeys.ts
es/form/shared.ts
es/notifications/hosts.ts
es/notifications/passkeys.ts
es/pages/app/migrations.ts
es/pages/app/settings.ts
es/pages/app/setup.ts
es/pages/console.ts
es/pages/home.ts
es/pages/hosts.ts
es/pages/passkeys.ts
es/validation/hosts.ts
es/validation/passkeys.ts
```

`en/` hoy solo tiene `en/formats/datetime.format.ts` y `en/formats/number.format.ts` (ya correctos: `currency: 'USD'` vs `'EUR'` en es, `year/month/day` en inglés).

## Consideraciones de traducción

- **Mismo árbol de claves.** Cada archivo `en/...` debe exportar las mismas claves `snake_case` que su equivalente en `es`, con `satisfies LocaleMessageValue` (nunca cast).
- **Backend agnóstico:** `es/tauri.ts` contiene mensajes de errores/success del backend que llegan como claves i18n con parámetros `{reason}`, `{id}`, `{field}`, `{path}`, `{table}`, `{timeout}`, `{key}`, `{count}`. Traducir manteniendo los placeholders en el mismo orden/nombres.
- **Funciones en mensajes**: `es/overlays.ts` usa `(ctx: MessageContext) => ...` para `toast.description.canceled/error` — replicar la misma estructura (el generador de `typed-locale.d.ts` ya normaliza funciones a `string`, solo afecta a `es`).
- **Plurales** (sintaxis vue-i18n `1 | {count}`): ej. `overlays.dialog.files_review.removed_count`, `pages/app/settings.sections.database.migrations_applied`, `security.purged`, `security.versions_in_use`.
- **Errores tipográficos en es** (ej. `overlays.dialog.cancel_update.cancel: 'Canclear'`): NO corregirlos en `en` (es el idioma de referencia para claves, no valores); la traducción inglesa debe ser correcta.
- **Claves de `es/pages/app/settings.ts` sección `security`** (Stronghold): incluidas en el alcance — traducir todo el archivo.

## Alcance

### Archivos a crear en `en/` (28)

Espejo exacto de los 28 archivos de mensajes de `es/` listados arriba.

### Archivos que NO se tocan

- `en/formats/*` (ya existen y son correctos).
- `_loader.ts`, `i18n.ts`, `useLocale.ts`, `typed-locale.d.ts` (autogenerado).
- Cualquier componente/página (solo claves; no hay cambios de lógica).

## Pasos de implementación

1. Revisar archivos por archivo `es/...` → traducir al inglés asegurando misma estructura.
2. Crear los 28 archivos bajo `src/locales/en/**`.
3. Verificar coherencia de claves (mismas claves en es y en) — `warnMissingKeys` solo avisa de archivos faltantes, no de claves dentro de un archivo: revisar manualmente clave por clave.
4. Regenerar tipos con `bun run i18n:types` (detecta problemas de estructura en `es`; no depende de `en`).
5. Verificar build: `bun run build` (vue-tsc + vite).
6. Verificación funcional manual (dev): cambiar idioma a `en` y revisar todas las pantallas; en SO en inglés, arranque directo en `en`.
7. Actualizar `AGENTS.frontend.md` §5 si refleja que `en` solo tiene `formats/`.

## Verificación

- `bun run i18n:types` y `bun run build` sin errores.
- Sin warnings de `warnMissingKeys` para `en` en dev.
- Revisión visual del cambio de idioma en: dashboard app (tabs), hosts (lista/form/vista/validación), passkeys, consola remota, setup de deployer, migraciones, notificaciones/toasts, diálogos.

---

## Implementación (16ª sesión)

### Hecho

- Creados los **28 archivos espejo** en `src/locales/en/**` (mismos árboles de claves `snake_case`, `satisfies LocaleMessageValue`, mismos tipos string/función).
- `en/formats/number.format.ts`: alineado a `es` añadiendo `percent.maximumFractionDigits: 2` (era la única diferencia de claves detectada).
- **Plurales:** se conserva la sintaxis `1 | {count}` en todos los casos de 2 formas; en `notifications.hosts.check_updates.success.title/description` (3 formas en es: 0/1/2+) se usa sintaxis ICU `{count, plural, =0 {...} one {...} other {...}}` para que el inglés resuelva bien el caso `count===0` (inglés solo tiene categorías one/other).
- Verificación de coherencia de claves es↔en con script comparando los árboles (parseados por `typescript.transpileModule`): **28/28 archivos OK** (solo la diferencia de `percent.maximumFractionDigits`, ya corregida).
- `bun run i18n:types` OK — genera `typed-locale.d.ts` desde `es` (28 archivo(s) detectados, sin cambios respecto a `es`).
- `AGENTS.frontend.md` §5 actualizado: `en/` y `es/` tienen mensajes; al añadir claves en `es/` crear espejo en `en/` (avisa `warnMissingKeys` en dev).

### Pendiente / bloqueado

- Los errores preexistentes de `vue-tsc` (rutas `dashboard-default*` con `route-map.d.ts` desactualizado + literales vs enum `ModulesName`) los **corrigió el usuario** (tarea aparte).
- **`bun run build` ya pasa**: `vue-tsc --noEmit` limpio + `vite build` OK (13.11s). Solo quedan warnings informativos de tamaño de chunks.
- Queda la **verificación funcional manual en dev** (cambiar idioma a `en`, revisar pantallas; arranque directo en `en` en SO en inglés) — paso del usuario.
- El plan queda listo para que el usuario lo marque como **Completado** (solo él lo cierra) y se mueva a `.agents/plans.done/`.