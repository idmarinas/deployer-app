# DeployerApp

Aplicación de escritorio para **desplegar y administrar sitios web vía SSH/SFTP**, construida con **Tauri**, **Vue 3** y **TypeScript**. Las credenciales se cifran con **AES-256-GCM** en un vault Stronghold y todos los datos residen en una **base de datos local**.

## Características

- **Consola remota** — comandos SSH con salida en streaming y control de la ejecución.
- **Gestión de servidores** — test de conexión, info del sistema, métricas y actualizaciones de paquetes con cooldowns.
- **Claves de acceso SSH** — cifrado transparente, soporte de passphrase y copia de la clave pública a servidores.
- **Comandos reutilizables** — parsers (raw, json, line-based, regex) y test contra un host real antes de guardar.
- **Multilenguaje** — interfaz en español e inglés, con tema claro y oscuro.

## Documentación

La documentación completa (instalación, guía rápida y referencia por módulos) está disponible en <https://idmarinas.github.io/deployer-app>.

## Desarrollo

Requisitos: [Bun](https://bun.sh), [Rust](https://www.rust-lang.org) y las dependencias nativas de [Tauri](https://tauri.app/start/prerequisites/).

```bash
bun install
bun run tauri:dev    # Desarrollo (Vite, puerto 1420)
bun run tauri build  # Binario instalable
```

La base de datos es **SQLite** gestionada con **Drizzle ORM** en modo proxy contra un comando `query_raw` de Tauri. Las migraciones SQL (generadas con `bun run drizzle:generate` y aplanadas a `src-tauri/migrations/`) se ejecutan automáticamente al crear o abrir la base de datos.