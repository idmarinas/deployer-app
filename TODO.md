# Versión 0.1.0

Se centra en los módulos:
1. Docker compose.yaml
2. Crear los hosts
3. Crear las claves de acceso.


# TODO

1. Inputs, Crear un warpper para Inputs, Textareas, Selects, etc. que se puedan crear de una forma mas sencilla, con ciertos añadidos.
   - Ejemplo el trailing, que agrega un contador de límite de caracteres.
2. Integrar la edición en la lista de items (en host, en la vista de todos los host integrar ver la información del host y poder editarlo)
3. En la lista, permitir cambiar activo/inactivo desde la propia lista de la tabla.
4. Comprobar si se puede generar todas las páginas de una forma más sencilla y si es así, refactorizar el código.
5. En la vista (lista) mejorar el como se muestra la tabla y el empty. Ahora se muestra la tabla en estado de cargando y si no hay datos se oculta y se muestra el bloque empty
6. Cuando se usa un select que permita seleccinar un host, project... permitir el crear uno. Como USelectMenu lo permite en su documentación
7. Ajustes de la app, agregar a la tabla campo para determinar si se cargan al inicio o no.
8. Estudiar rollback automático de despliegues: cuando una task falla con on_failure=stop, el runner se detiene pero no revierte las tasks anteriores que ya se ejecutaron con éxito.
9. Valorar soporte futuro para BD remota (PostgreSQL/MariaDB) en vez de SQLite local, permitiendo uso multi-instancia/colaborativo.
10. Posibilidad de actualizar las claves de encriptación. (Renovar claves). Si se cambia de clave, se debe poder actualizar en todos los registros que esten encriptados.
11. La pantalla de ajustes de la aplicación, mostrarla en modo pestañas.
	- También se puede dividir entre lo que es la configuración y mera información.

## Passkeys

1. Poder ver la cláve pública.

## Hosts

1. Hosts (Servidores) agregar el poder manejar ciertos aspectos del servidor:
	- Comprobar si hay actualizaciones
		- Actualizar el paquete seleccionado o varios.
	- Comprobar el espacio en disco usado (¿poder liberar espacio?)
	- Integración con n8n para ver el estado de uso de cpu/ram/disco (el workflow creado usar sus datos)

## Docker Compose