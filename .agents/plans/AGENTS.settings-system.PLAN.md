# Plan: Sistema de ajustes de la aplicación (deployer_settings)

## Estado

**Planificando**

---

## Instrucciones dadas (verbatim)

> Extraído de `AGENTS.todo.md` (tarea 2 de `### Tareas`):
>
> 2. Nueva implementación, crear el plan, como planificando y dejarlo así. (Esta es una implementación a futuro)
>    1. Un sistema de ajustes para la aplicación que se guardan en la BD (en la tabla actual disponible).
>    2. Estos ajustes, pueden ser que se carguen nada más abrir la aplicación, para lo cual se añadira un campo flag que determina si el ajuste se carga al inicio de la app.
>    3. Para lo cual, se tendrá que crear un módulo en el frontend que permita gestionar estos tipos de ajustes, para poder usarlos donde sea necesario.
>    4. Se añadirá un campo adicional más a la tabla que indica a que modulo pertenece dicho ajuste, así los ajustes propios de por ejemplo, passkeys tendrán todos en este campo el valor de passkeys, y los de hosts el valor de hosts. Puede haber ajustes específicos de la app.
>    5. Teniendo en cuenta el punto anterior, esto permite organizar los ajustes, por modulos en formato de pestañas.
>    6. Se añadirá un campo adicional un flag, que indica si el ajuste se puede modificar por el usuario o no. Esto permitirá que en la pantalla de configuración aparezca el ajuste o no.

---

## Resumen

Implementación **a futuro** (pendiente de planificar en detalle). Sistema de ajustes persistidos en `deployer_settings` (tabla actual) con metadatos por ajuste: flag de carga al inicio de la app, módulo al que pertenece y flag de modificación por el usuario. El frontend tendrá un módulo gestor de ajustes y una pantalla de configuración organizada por módulos en pestañas.

## Contexto actual (para la planificación posterior)

- La tabla actual `deployer_settings` (`src-tauri/migrations/0001_initial_schema.up.sql`) es `key TEXT PRIMARY KEY`, `value TEXT`, `created_at`, `updated_at`. Solo guarda el valor; **no** tiene metadatos por ajuste.
- Ya existe backend de ajustes: `get_deployer_setting`, `set_deployer_setting`, `set_deployer_settings`, `list_deployer_settings`, `delete_deployer_setting` (`src-tauri/src/commands/deployer_settings/`), con `DeployerSetting { key, value }`.
- Uso actual: cooldowns de hosts (`hosts.system_info_cooldown_hours`, `hosts.status_info_cooldown_minutes`) leídos en `src-tauri/src/commands/hosts/status.rs`.
- Regla de migraciones (AGENTS.md): sin bump de versión, los cambios de esquema se editan **en sitio** en `0001_initial_schema.up.sql`/`.down.sql` (versión en curso: 0.1.0).

## Puntos pendientes de decidir (a resolver en la planificación detallada)

1. **Metadatos por ajuste**: la instrucción pide 3 campos nuevos (flag de carga al inicio, módulo, flag de modificable). ¿Se añaden a `deployer_settings` como columnas con valores por defecto (migración en sitio) o se crea una tabla de definición de ajustes separada?
2. **Módulo frontend**: composable/store + carga al inicio (¿Drizzle vía `query_raw` para lecturas, comando Rust para escrituras según AGENTS.md?).
3. **Pantalla de configuración**: ruta nueva (¿`dashboard/app/settings.vue` o similar?), pestañas por módulo, visibilidad según `modificable`.
4. **Valores por defecto** de los ajustes existentes (cooldowns de hosts) y qué módulos migran sus valores duros actuales a ajustes.
5. **i18n** para etiquetas y categorías de módulos.

---

## Estado actual

Este plan queda en **Planificando** (implementación a futuro). No se ejecuta.
