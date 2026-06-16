# Guía para Agentes - DeployerApp

Bienvenido al proyecto **DeployerApp**. Esta guía está diseñada para ayudar a los agentes de IA a comprender la arquitectura, las reglas y los estándares del proyecto para asegurar una colaboración eficiente.

## 1. Descripción del Proyecto

DeployerApp es una aplicación de escritorio diseñada para gestionar el despliegue de aplicaciones, inspirada en las funcionalidades de [DeployerPHP.org](https://deployer.org/).

Su objetivo es **sustituir DeployerPHP** en los proyectos por un único deployer centralizado, que permite desplegar cada proyecto con unos pasos configurables, sin necesidad de crear archivos de deploy por cada proyecto.

### Características Principales
- **Ejecución Local:** Aplicación de escritorio multiplataforma (vía Tauri 2).
- **Configuración:** Almacenada en una base de datos **SQLite** local en el PC del usuario.
- **SSH:** Conexión a servidores remotos, ejecución de comandos y transferencia de archivos.
- **Cifrado transparente:** Los campos sensibles se cifran automáticamente en SQLite mediante AES-256-GCM. La clave maestra reside en el keychain del SO.
- **Runner universal:** Motor de ejecución de deployments via `run_deployment` (command, script, upload_file, download_file).

---

## 2. Stack Tecnológico

Es fundamental respetar el stack tecnológico elegido:

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Vue.js 3 + TypeScript + [Nuxt UI v4](https://ui.nuxt.com/) (como librería, **no** como meta-framework) |
| **Enrutamiento** | Vue Router directamente (no el enrutamiento basado en archivos de Nuxt) |
| **Estilos** | Tailwind CSS v4 (integrado en Nuxt UI) |
| **Estado** | Pinia |
| **Backend** | Rust + [Tauri 2](https://tauri.app/) |
| **Base de Datos** | SQLite gestionada desde el backend en Rust |
| **Gestor de paquetes** | Bun |

---

## 3. Reglas de Oro (Obligatorias para todos los agentes)

Estas reglas deben seguirse sin excepción:

1. **Idioma:** Responde siempre en **Español**.
2. **Archivos Protegidos:** NO modifiques archivos con extensión `.dist`, ni carpetas con sufijo `.dist`.
3. **Carpetas Restringidas:** NO modifiques contenido en `node_modules`, `vendor` o `var`.
4. **Flujo de Trabajo:** Antes de realizar cualquier cambio en el código, **crea un plan de implementación** y espera la aprobación del usuario.
5. **Dependencias:** Antes de instalar nuevas dependencias, comprueba las que ya existen en `package.json` y en `src-tauri/Cargo.toml`.
6. **Leer antes de modificar:** Lee siempre el archivo actual antes de editarlo. Nunca asumas el estado del código.

---

## 4. Estructura del Proyecto

```
deployer-app/
├── src/                        <- Frontend (Vue + TypeScript)
│   ├── components/             <- Componentes reutilizables de UI
│   ├── composables/            <- Lógica reactiva reutilizable de Vue
│   ├── constants/              <- Constantes globales (ej. nombres de tablas)
│   ├── pages/                  <- Vistas de la aplicación
│   └── utils/                  <- Funciones puras sin reactividad de Vue
└── src-tauri/                  <- Backend (Rust + Tauri)
    ├── crates/deployer-macros/ <- Proc-macros para derivar traits automáticamente
    ├── migrations/             <- Archivos SQL de migración
    └── src/
        ├── commands/           <- Comandos Tauri (un archivo por comando)
        │   └── helpers.rs      <- open_pool(), get_master_key(), open_crypto_context()
        ├── crypto/             <- Cifrado AES-256-GCM + keychain
        ├── db/                 <- Trait DbEntity, caché, operaciones CRUD genéricas
        └── lib.rs              <- Registro de comandos Tauri y estado global
```

---

## 5. Guías específicas por dominio

Según el tipo de tarea, consulta la guía correspondiente **antes de implementar**:

### Backend (Rust)
> Comandos Tauri, base de datos, cifrado, SSH, migraciones, proc-macros.

-> **[AGENTS.backend.md](./AGENTS.backend.md)**

Úsala cuando:
- Crear o modificar un comando Tauri
- Añadir campos a la BD o crear una migración
- Trabajar con el runner de deployments
- Modificar el sistema de cifrado o el proc-macro `DbEntity`
- Añadir dependencias en `Cargo.toml`

---

### Frontend (Vue)
> Componentes, composables, páginas, i18n, Nuxt UI, tipos TypeScript.

-> **[AGENTS.frontend.md](./AGENTS.frontend.md)**

Úsala cuando:
- Crear o modificar componentes Vue
- Añadir páginas o rutas
- Implementar la UI del runner de deployments
- Trabajar con composables, i18n o el sistema de toolbar
- Añadir dependencias en `package.json`

---

## 6. Comandos Útiles

```bash
bun run tauri dev      # Inicia el servidor de desarrollo (Vite + Tauri)
bun run tauri build    # Genera el paquete de producción
```

---

> [!TIP]
> Si encuentras alguna ambigüedad en los requerimientos, siempre pide aclaración antes de proceder, pero propón una solución inicial basada en estas directrices.
