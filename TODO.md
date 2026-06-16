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

```ts
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window'
// TODO: Eliminar este botón de prueba
items.push({
	label: 'Restablecer ventana',
	color: 'warning',
	variant: 'outline',
	icon: 'i-tabler-window',
	onClick: async () => {
		const win = getCurrentWindow()
		await win.setSize(new LogicalSize(1400, 900))
		await win.center()
	},
})
```
