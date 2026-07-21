# TODO

1. Inputs, Crear un warpper para Inputs, Textareas, Selects, etc. que se puedan crear de una forma mas sencilla, con ciertos añadidos.
   - Ejemplo el trailing, que agrega un contador de límite de caracteres.
2. Integrar la edición en la lista de items (en host, en la vista de todos los host integrar ver la información del host y poder editarlo)
3. En la lista, permitir cambiar activo/inactivo desde la propia lista de la tabla.
4. Comprobar si se puede generar todas las páginas de una forma más sencilla y si es así, refactorizar el código.
5. Añadir la página de ajustes para determinar que campos se van a cifrar en la base de datos.
6. En la vista (lista) mejorar el como se muestra la tabla y el empty. Ahora se muestra la tabla en estado de cargando y si no hay datos se oculta y se muestra el bloque empty
7. Revisar para hacer ciertas acciones mas reusables (borrar un item, se puede crear una función que se pueda reutilizar para borrar varios tipos de items)
8. Campos password agregar un medidor de fuerza (como guia), tener en cuenta si el campo es opcional o no.
9. Cuando se usa un select que permita seleccinar un host, project... permitir el crear uno. Como USelectMenu lo permite en su documentación
10. Actualizar la pantalla de carga (principal) para que sea igual que el resto de la app
11. Ajustes de la app, agregar a la tabla campo para determinar si se cargan al inicio o no.
12. Estudiar rollback automático de despliegues: cuando una task falla con on_failure=stop, el runner se detiene pero no revierte las tasks anteriores que ya se ejecutaron con éxito.
13. Valorar soporte futuro para BD remota (PostgreSQL/MariaDB) en vez de SQLite local, permitiendo uso multi-instancia/colaborativo.
14. Posibilidad de actualizar las claves de encriptación. (Renovar claves). Si se cambia de clave, se debe poder actualizar en todos los registros que esten encriptados.
15. La pantalla de ajustes de la aplicación, mostrarla en modo pestañas.
	- También se puede dividir entre lo que es la configuración y mera información.
16. Comprobar si Nuxt Icon puede descargar los iconos para que no se descarguen desde internet.
17. Hosts (Servidores) agregar el ponder manejar ciertos aspectos del servidor:
	- Comprobar si hay actualizaciones
		- Actualizar el paquete seleccionado o varios.
	- Comprobar el espacio en disco usado (¿poder liberar espacio?)
	- Integración con n8n para ver el estado de uso de cpu/ram/disco (el workflow creado usar sus datos)
