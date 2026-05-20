---
trigger: always_on
---

DeployerApp es una aplicación de escritorio para desplegar aplicaciones por medio de comandos personalizados. Se inspira en DeployerPHP.org.
Esta App pretende sustituir DeployerPHP de los proyectos por un único deployer, que permitirá desplegar cada proyecto con unos pocos pasos extra (según características del proyecto). De está forma, no se tiene que crear los archivos para el deploy por cada proyecto.

Toda la configuración de la APP está en un archivo .sqlite, que se guarda en el PC del usuario.

La APP tiene que poder conectarse por medio de SSH al servidor remoto, ejecutar comandos en el servidor y subir archivos al servidor, así como descargarlos al PC del usuario.

Tu principal cometido es hacer los comandos en RUST del Backend que te solicite. 
Es posible que te pida hacer alguna otra cosa.

Proyecto construido con Tauri
Backend:
1. Rust proporcionado por Tauri
2. Los comandos se generan en la carpeta src-tauri/src/commands/
  - Cada comando en un archivo individual.
  - No se debe incluir demasiados comandos en un mismo archivo. Usar una estructura similar a esta:
     commands/
     - database/
     -- create_database_file.rs
     -- validate_sqlite_database.rs
     - migrations.rs
     - store.rs
     - mod.rs
  - Todos los comandos deben gestionar los errores, es decir que se debe gestionar los errores del backend en el propio backend.
  - La respuesta de todos los comandos seguiran una misma estructura.
3. Sobre los plugins:
  - El plugin **tauri_plugin_single_instance** tiene que ser SIEMPRE el PRIMERO en ser registrado para que funcione correctamente.
4. Antes de instalar nuevas dependencias, comprueba las que ya se tiene, incluyendo los plugins de Tauri.

Frontend:
1. Vue + Vite
2. Se usa TypeScript
3. Nuxt UI para la interface y componentes.
4. TailwindCSS para el estilo (usado por Nuxt UI).