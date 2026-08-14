# Tareas a completar por el AGENTE

## IMPORTANTE a seguir

1. **Agrupar y planificar.** Cuando llegue una lista de tareas, agruparlas según el cambio que solicitan:
   - Tareas que tocan el mismo sistema, módulo o cambio → **un mismo grupo**.
   - Por cada grupo se crea **un plan** (ver punto 2).
2. **Planes.**
   - Nombre: `AGENTS.[nombre_descriptivo_del_plan].PLAN.md`.
   - Ubicación: `.agents/plans/`.
   - El plan es el historial del cambio: registra decisiones y todos los cambios hechos.
   - Al inicio, el plan incluye las **instrucciones dadas** en las tareas del grupo (verbatim).
3. **Creación de un plan.**
   - Al crear el plan, las instrucciones de las tareas agrupadas se **mueven** al inicio del plan como **instrucciones dadas**.
   - Todo plan se crea **SIEMPRE** en estado **Planificando** y **no se ejecuta** hasta que esté terminado de planificar.
   - Las tareas se **eliminan** de la sección `### Tareas` y se añade una **referencia al plan** en `### Tareas en curso`.
4. **Ejecución.**
   - El agente **solo** puede cambiar un plan de **Pendiente** a **Ejecutando** (al empezar a implementarlo); el resto de cambios de estado los hace el usuario.
   - Preferiblemente pocas tareas a la vez, de una en una y de la más sencilla a la más compleja.
   - Si una tarea depende de otra, ejecutarlas en el orden correcto y dejar constancia en este archivo.
   - Todas las tareas de este archivo se trabajan en **modo PLAN** (el plan se redacta antes de implementar).
5. **Cierre de un plan.**
   - **Solo el usuario** da por completado un plan que está en **Ejecutando**.
   - Cuando el plan está implementado y verificado, se marca como **completado** en el propio archivo.
   - Se mueve de `.agents/plans/` a `.agents/plans.done/`.
   - Se añade una entrada en `.agents/AGENTS.done.md` (este archivo **sustituye** a `AGENTS.todo.done.md`) con una **pequeña nota** y la **referencia al plan** terminado.
   - Se **elimina la referencia al plan** de `### Tareas en curso`.
6. Leer `@AGENTS.md` para entender el proyecto y las reglas técnicas globales (incluida la de migraciones SQL). Si es necesario, actualizar los archivos AGENTS.

### Tareas

> Aquí es donde se ponen las tareas a realizar. Al crear un plan para un grupo, sus tareas se eliminan de esta sección.

### Tareas en curso

> Estados de un plan (el inicial es **Planificando**):
>
> - **Planificando** — aún se está ajustando el plan; no se puede ejecutar.
> - **Pendiente** — plan listo para ejecutar, aún no comenzado.
> - **Ejecutando** — se está implementando (incluida la verificación).
> - **Bloqueado** — aún no es el momento de implementarlo: espera a otra tarea o dependencia, o simplemente se ha decidido aplazarlo.
>
> Transiciones: el agente **solo** puede pasar un plan de **Pendiente** a **Ejecutando**. El resto de cambios de estado (incluido dar por **completado**) los decide el usuario.
>
> Al completar un plan, se elimina su referencia. El registro de lo realizado queda en `.agents/AGENTS.done.md`.

- **Planificando:** Tablas personalizadas → `.agents/plans/AGENTS.custom-tables.PLAN.md`
- **Planificando:** Sistema de ajustes (a futuro) → `.agents/plans/AGENTS.settings-system.PLAN.md`
