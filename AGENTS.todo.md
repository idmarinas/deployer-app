# Tareas a completar por el AGENTE

> Este archivo contiene solo el **estado**: tareas pendientes de planificar y planes en curso.
> Las reglas del flujo (diseños, agrupar, crear planes, estados, ejecución, verificación y cierre) viven en la skill global **`plan-workflow`**. Si tu agente no la carga automáticamente, léela (`~/.agents/skills/plan-workflow/SKILL.md`) antes de tocar este archivo.
> Todas las tareas de este archivo se trabajan en **modo PLAN** (el plan se redacta antes de implementar).

### Tareas

> Aquí es donde se ponen las tareas a realizar. Al crear un plan para un grupo, sus tareas se eliminan de esta sección.

### Tareas en curso

> Estados de un plan (el inicial es **Planificando**): **Planificando** · **Pendiente** · **Ejecutando** · **Bloqueado**. Definiciones y transiciones en la skill. El agente **solo** puede pasar un plan de **Pendiente** a **Ejecutando**; el resto de cambios de estado (incluido dar por terminado) los decide el usuario.
>
> Al terminar un plan se elimina su referencia de aquí; el registro queda en `.agents/AGENTS.done.md`.

- **Planificando:** Tablas personalizadas → `.agents/plans/AGENTS.custom-tables.PLAN.md`
- **Planificando:** Sistema de ajustes (a futuro) → `.agents/plans/AGENTS.settings-system.PLAN.md`
- **Planificando:** Sustituir `query_raw` por `tauri-plugin-sql` → `.agents/plans/AGENTS.plugin-sql.PLAN.md`
