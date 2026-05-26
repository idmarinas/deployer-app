# Guía para Agentes - DeployerApp

Bienvenido al proyecto **DeployerApp**. Esta guía está diseñada para ayudar a los agentes de IA a comprender la arquitectura, las reglas y los estándares del proyecto para asegurar una colaboración eficiente.

## 1. Descripción del Proyecto
DeployerApp es una aplicación de escritorio diseñada para gestionar el despliegue de aplicaciones, inspirada en las funcionalidades de [DeployerPHP.org](https://deployer.org/).

Su objetivo es **sustituir DeployerPHP** en los proyectos por un único deployer centralizado, que permite desplegar cada proyecto con unos pasos configurables, sin necesidad de crear archivos de deploy por cada proyecto.

### Características Principales:
- **Ejecución Local:** Aplicación de escritorio multiplataforma (vía Tauri 2).
- **Configuración:** Almacenada en una base de datos **SQLite** local en el PC del usuario.
- **Importación:** Permite importar archivos de configuración existentes.
- **SSH:** Conexión a servidores remotos, ejecución de comandos y transferencia de archivos.

## 2. Stack Tecnológico
Es fundamental respetar el stack tecnológico elegido:
- **Frontend:** [Vue.js 3](https://vuejs.org/) con TypeScript y [Nuxt UI v3](https://ui.nuxt.com/) como librería de componentes (**no** como meta-framework).
- **Enrutamiento:** Vue Router directamente (no el enrutamiento basado en archivos de Nuxt).
- **Backend:** [Rust](https://www.rust-lang.org/) utilizando [Tauri 2](https://tauri.app/).
- **Estilos:** Tailwind CSS v4 (integrado en Nuxt UI).
- **Estado:** Pinia.
- **Base de Datos:** SQLite gestionada desde el backend en Rust.
- **Gestor de paquetes:** Bun.

## 3. Reglas de Oro (Obligatorias)
Estas reglas deben seguirse sin excepción:
1. **Idioma:** Responde siempre en **Español**.
2. **Archivos Protegidos:** NO modifiques archivos con extensión `.dist`, ni carpetas con sufijo `.dist`.
3. **Carpetas Restringidas:** NO modifiques contenido en `node_modules`, `vendor` o `var`.
4. **Flujo de Trabajo:** Antes de realizar cualquier cambio en el código, **crea un plan de implementación** y espera la aprobación del usuario.
5. **Dependencias:** Antes de instalar nuevas dependencias, comprueba las que ya existen en `package.json` y en `src-tauri/Cargo.toml`.
6. **Plugins Tauri:** El plugin `tauri_plugin_single_instance` debe ser **siempre el primero** en registrarse.

## 4. Estructura del Proyecto
- `/src`: Lógica del Frontend (Vue + TypeScript).
  - `/components`: Componentes reutilizables de UI.
  - `/composables`: Lógica reactiva reutilizable de Vue.
  - `/constants`: Constantes globales del proyecto (ej. nombres de tablas de BD).
  - `/pages`: Vistas de la aplicación.
  - `/utils`: Funciones puras sin reactividad de Vue.
- `/src-tauri`: Lógica del Backend (Rust).
  - `src/commands/`: Comandos Tauri, **un archivo por comando**.
  - `src/migrations/`: Archivos SQL de migración de la base de datos.
  - `src/lib.rs`: Registro de comandos Tauri.
  - `tauri.conf.json`: Configuración de la aplicación Tauri.

## 5. Convenciones de Desarrollo

### Frontend (Vue)
- Prioriza el uso de componentes de **Nuxt UI** para mantener la coherencia visual.
- Usa **TypeScript** para todo el desarrollo.
- Usa **`@/`** como alias para la carpeta `src/`.

### Composables vs Utilidades
- **`/composables`**: Solo para lógica que usa reactividad de Vue (`ref`, `computed`, `onMounted`, etc.).
- **`/utils`**: Para funciones puras sin reactividad. Si una función no necesita Vue, va aquí.

### Constantes de Base de Datos
Los nombres de las tablas están centralizados en `src/constants/dbTables.ts`:

```ts
export const DB_TABLES = {
  APP_SETTINGS: 'app_settings',
} as const
```

**Nunca escribir el nombre de una tabla como string literal** fuera de este archivo. Si cambia el nombre en la BD, solo se actualiza aquí.

### Backend (Rust)
- Implementa cada comando Tauri en un archivo individual dentro de `src-tauri/src/commands/`.
- Regístralos en `lib.rs`.
- La lógica de acceso a SQLite debe centralizarse en el backend para garantizar seguridad y rendimiento.

## 6. Patrones de Acceso a Base de Datos

### useDatabase
El composable `useDatabase` gestiona la conexión SQLite y expone los métodos base de acceso:
- `load()`: Fuerza la inicialización de la conexión.
- `select<T>()`: Ejecuta un SELECT y devuelve un array tipado.
- `first<T>()`: Devuelve el primer resultado de un SELECT, o null.
- `execute()`: Ejecuta INSERT, UPDATE o DELETE. Devuelve `ExecuteResult`.
- `transaction(callback)`: Ver sección de transacciones más abajo.
- `beginTransaction()` / `commit()` / `rollback()`: Transacción manual explícita (uso avanzado).

### useQuery
El composable `useQuery` contiene todas las consultas de negocio organizadas por tabla.

#### Patrón OrThrow (obligatorio para métodos futuros)
Cada método de escritura debe tener **dos variantes**:

| Variante | Comportamiento | Cuándo usar |
|---|---|---|
| `saveXxx()` | Captura el error y devuelve `{ error: string \| null }` | Uso general, fuera de transacciones |
| `saveXxxOrThrow()` | Lanza la excepción tal cual | Dentro de `transaction()` |

La lógica real vive en `OrThrow`. La variante segura es un wrapper:

```ts
async function saveDeployerSettingsOrThrow(settings: Record<string, string>): Promise<ExecuteResult> {
  // lógica real — lanza si falla
}

async function saveDeployerSettings(settings: Record<string, string>): Promise<ExecuteResult> {
  try {
    return await saveDeployerSettingsOrThrow(settings)
  } catch (e) {
    console.error('Error saving app settings:', e)
    return { rowsAffected: 0, lastInsertId: 0, error: String(e) }
  }
}
```

### Transacciones con transaction()
Para operaciones relacionadas que deben ser atómicas (todas o ninguna), usar `transaction()`:

```ts
const { transaction } = useDatabase()
const { saveHostOrThrow, saveProjectOrThrow } = useQuery()

await transaction(async () => {
  await saveHostOrThrow(host)
  await saveProjectOrThrow(project)
})
```

**Reglas:**
- Dentro de `transaction()`, usar **siempre** las variantes `OrThrow`.
- Si cualquier operación lanza una excepción, se hace `ROLLBACK` automático.
- Si todo va bien, se hace `COMMIT` automático.
- Capturar el error fuera del `transaction()` con `try/catch`.

Este patrón es similar al **Unit of Work de Doctrine ORM**.

## 7. Comandos Útiles
- `bun run tauri dev`: Inicia el servidor de desarrollo de Vite y Tauri.
- `bun run tauri build`: Genera el paquete de producción de la aplicación.

---
> [!TIP]
> Si encuentras alguna ambigüedad en los requerimientos, siempre pide aclaración antes de proceder, pero propón una solución inicial basada en estas directrices.
