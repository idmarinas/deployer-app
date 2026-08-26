# TODO

1. Inputs, Crear un warpper para Inputs, Textareas, Selects, etc. que se puedan crear de una forma mas sencilla, con ciertos añadidos.
   - Ejemplo el trailing, que agrega un contador de límite de caracteres.
2. Integrar la edición en la lista de items (en host, en la vista de todos los host integrar ver la información del host y poder editarlo)
3. En la lista, permitir cambiar activo/inactivo desde la propia lista de la tabla.
4. Comprobar si se puede generar todas las páginas de una forma más sencilla y si es así, refactorizar el código.
5. Ajustes de la app, agregar a la tabla campo para determinar si se cargan al inicio o no.
6. Estudiar rollback automático de despliegues: cuando una task falla con on_failure=stop, el runner se detiene pero no revierte las tasks anteriores que ya se ejecutaron con éxito.
7. Valorar soporte futuro para BD remota (PostgreSQL/MariaDB) en vez de SQLite local, permitiendo uso multi-instancia/colaborativo.
8. Posibilidad de actualizar las claves de encriptación (de la app). (Renovar claves). Si se cambia de clave, se debe poder actualizar en todos los registros que esten encriptados.
9. Comprobar que toda llamada al backend tiene un toast con loading > success | error
10. Cuando se agreguen las tablas personalizadas, agruparlas en la información de la BD (Configuración DeployerApp)
11. Sistema de cifrado:
    1. Estudiar usar Stronghold para guardar las claves de des/cifrado se seguiría usando el keychain para la clave maestra que desbloquea el vault de Stronghold.
12. Página de lista:
    1. En las páginas de lista, cambiar la forma en la que se borran los items.
        1. Cuando se borra un item, marcar dicho item de la lista (destacandolo) y luego borrar solo ese item, sin necesidad de recargar toda la lista.
13. Cambiar base de datos:
    1. Cuando se permita cambiar la BD, agregar un setting para ponerle nombre a esa BD y ponerlo en la parte superior izquierda (donde está ahora el nombre de la app)

  ```ts
  async function changeDatabasePath() {
   // Para cambiar la BD usar la misma lógica de cuando se carga un archivo .sqlite en (setup).vue
  const selected = await open({
  directory: false,
  multiple: false,
  title: t('pages.app.settings.sections.database.change'),
  filters: [
   {
   name: 'SQLite Files',
   extensions: ['sqlite'],
   },
  ],
  })

  if (!selected) return

  isChangingDb.value = true

  try {
  const setResponse = await invoke<CommandResponse>('set_database_path', { path: selected })

  if (!setResponse.success) {
   toast.add({
   title: t('overlays.toast.title.error'),
   description: t('pages.app.settings.sections.database.change_error'),
   color: 'error',
   })
   return
  }

  const migrationResponse = await invoke<CommandResponse>('execute_migrations')

  if (!migrationResponse.success) {
   toast.add({
   title: t('overlays.toast.title.error'),
   description: t('pages.app.settings.sections.database.change_error'),
   color: 'error',
   })
   return
  }

  toast.add({
   title: t('overlays.toast.title.success'),
   description: t('pages.app.settings.sections.database.change_success'),
   color: 'success',
  })

  window.location.reload()
  } catch {
  toast.add({
   title: t('overlays.toast.title.error'),
   description: t('pages.app.settings.sections.database.change_error'),
   color: 'error',
  })
  } finally {
  isChangingDb.value = false
  }
  }
  ```

## Versión 0.1.0

Se centra en los módulos:

1. Docker `compose.yaml`
2. Crear los hosts
3. Crear las claves de acceso.

## Módulos

### Passkeys

1. Poder ver la cláve pública.
   - Se puede guardar en la tabla, para evitar tener que calcularla cada vez.
2. Comprobar si se le puede poner una duración a la clave.
   - No se puede hacer. La clave no permite esto.
   - Alternativa: usar un campo expire en la BD para que la App deje de usar una clave expirada.
     - También puede ser como orientación para renovar la clave e inutilizar la antigua.
3. Incluir que servidores están usando la clave de acceso.
4. Poder des/activar una clave de acceso, para permitir borrarla
   - Cuando una clave de acceso está desactivada, el host no la puede usar.

### Hosts

1. Hosts (Servidores) agregar el poder manejar ciertos aspectos del servidor:
   - Comprobar si hay actualizaciones
     - Actualizar el paquete seleccionado o varios.
     - Comprobar el espacio en disco usado (¿poder liberar espacio?)
   - Integración con n8n para ver el estado de uso de cpu/ram/disco (el workflow creado usar sus datos)
2. Los comandos que obtienen información del servidor, tener encuenta el SO a la hora de ejecutar comandos.
3. Permitir tener varias claves de acceso.
   - Una idea, puede que no sea útil.
   - Puede que sea más interesante guardar la clave de acceso y la contraseña para acceder al servidor (usando solo una)

### Docker Compose

1. Cuando se desplega un nuevo compose, se deberia comprobar si es mejor:
   1. Se genere primero el nuevo sin sustituir al antiguo
   2. Que se suba a una nueva completa y cuando se complete el despliegue se haga una redirección (Algo similar a DeployerPHP)

### Commands (antes Tasks)

1. Este nombre para el proposito que tiene este módulo no es adecuado
   - Actualmente este módulo su proposito es crear los comandos que se va a ejecutar para cada proyecto.
2. Cambiar el nombre por "Commands" que es más apropiado para lo que va a hacer.

### Tasks (nueva versión)

1. Este es un módulo nuevo. que no tiene nada que ver con el de arriba.
2. Este nuevo módulo su función es para crear tareas que se ejecutarán por la aplicación a ciertos intervalos y en un cron.
3. IDEA, este es un módulo que es una IDEA, no es definitivo.
4. Propositos para lo que se pensó:
   - Crear una tarea que se ejecute cada X tiempo para comprobar si los servidores tienen actualizaciones (aunque se puede hacer de forma manual puede que se olvide comprobarlo)
   - Las tareas se pueden crear para todos los módulos y sus items.
   - Muestra la última vez que se ejecuto, y si hubo algún problema.
