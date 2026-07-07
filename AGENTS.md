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
- **Lecturas flexibles:** Las consultas SELECT ad-hoc sin campos cifrados se hacen desde el frontend con Drizzle (modo proxy) sobre el comando `query_raw`, sin necesidad de crear un comando Rust nuevo para cada variación.

---

## 2. Stack Tecnológico

Es fundamental respetar el stack tecnológico elegido:

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Vue.js 3 + TypeScript + [Nuxt UI v4](https://ui.nuxt.com/) (como librería, **no** como meta-framework) |
| **Enrutamiento** | Basado en archivos (`src/pages/`), vía `vue-router/vite` (unplugin-vue-router) — **no** es el sistema de rutas de Nuxt, pero sí genera rutas automáticamente desde la estructura de carpetas |
| **Estilos** | Tailwind CSS v4 (integrado en Nuxt UI) |
| **Estado** | `@pinia/colada` (cache/queries de datos de servidor). **No se usa Pinia como store de estado de app** |
| **Backend** | Rust + [Tauri 2](https://tauri.app/) |
| **Base de Datos** | SQLite gestionada desde el backend en Rust |
| **Lecturas ad-hoc** | Drizzle ORM (modo proxy) desde el frontend, vía comando `query_raw` |
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
7. **Comandos de solo lectura nuevos:** Antes de crear un comando Rust de tipo `crud_get_*` / `crud_list_*` nuevo, valora si la tabla tiene campos cifrados o lógica especial. Si NO los tiene, la lectura debe hacerse desde el frontend con Drizzle (`src/lib/db.ts`) en lugar de crear un comando Rust. Ver sección 7.

---

## 4. Estructura del Proyecto

```
deployer-app/
├── drizzle/                    <- Artefactos de drizzle-kit introspect (NO migraciones)
│   ├── dev.sqlite              <- BD de desarrollo dedicada (gitignored)
│   ├── schema.ts               <- Schema TypeScript generado automáticamente
│   └── README.md               <- Flujo para regenerar el schema
├── drizzle.config.ts           <- Config de drizzle-kit (solo introspect)
├── src/                        <- Frontend (Vue + TypeScript)
│   ├── components/             <- Componentes reutilizables de UI
│   ├── composables/            <- Lógica reactiva reutilizable de Vue
│   ├── constants/              <- Constantes globales (ej. nombres de tablas)
│   ├── lib/
│   │   ├── db.ts               <- Cliente Drizzle (proxy) → comando query_raw
│   │   └── schema.ts           <- Schema Drizzle (copiado/ajustado desde drizzle/schema.ts)
│   ├── pages/                  <- Vistas de la aplicación
│   └── utils/                  <- Funciones puras sin reactividad de Vue
└── src-tauri/                  <- Backend (Rust + Tauri)
    ├── crates/deployer-macros/ <- Proc-macros para derivar traits automáticamente
    ├── migrations/             <- Archivos SQL de migración (fuente de verdad del schema)
    └── src/
        ├── commands/           <- Comandos Tauri (un archivo por comando)
        │   ├── helpers.rs      <- open_pool(), get_master_key(), open_crypto_context()
        │   └── database/
        │       └── query_raw.rs <- Comando genérico de solo lectura (SELECT) para Drizzle
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
- Hacer consultas SELECT ad-hoc con Drizzle (`src/lib/db.ts`)

---

## 6. Lecturas con Drizzle vs. comandos Rust

Regla de decisión al necesitar un nuevo dato del frontend:

| Situación | Solución |
|---|---|
| SELECT simple, tabla sin campos cifrados | Drizzle (`src/lib/db.ts`) — no crear comando Rust |
| SELECT con joins/filtros variables, sin campos cifrados | Drizzle (`src/lib/db.ts`) — no crear comando Rust |
| SELECT sobre tabla con campos cifrados que deben descifrarse | Comando Rust específico (usa `open_crypto_context`) |
| Cualquier escritura (INSERT/UPDATE) | Comando Rust CRUD específico (mantiene cifrado y validaciones) |
| DELETE | Comando Rust específico (controla cascadas y validaciones) |

El comando `query_raw` (`src-tauri/src/commands/database/query_raw.rs`) es el único punto de entrada para Drizzle: valida que el SQL sea `SELECT`, no descifra nada, y devuelve filas como JSON.

Cuando cambie el schema SQLite (nueva migración sqlx), regenerar `drizzle/schema.ts` siguiendo `drizzle/README.md`.

---

## 7. Comandos Útiles

```bash
bun run tauri dev        # Inicia el servidor de desarrollo (Vite + Tauri)
bun run tauri build      # Genera el paquete de producción
bun run db:introspect    # Regenera drizzle/schema.ts desde drizzle/dev.sqlite
```

---

> [!TIP]
> Si encuentras alguna ambigüedad en los requerimientos, siempre pide aclaración antes de proceder, pero propón una solución inicial basada en estas directrices.
