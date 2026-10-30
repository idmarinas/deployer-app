---
title: {{project_name}}
description: '{{project_name}} es una aplicación de escritorio para desplegar y administrar tus sitios web vía SSH/SFTP, con credenciales cifradas y control de los datos en una base local.'
# Additional for Docs only
# since: '1.0'
# deprecated:
#   since: '1.5'
#   removed: '2.0'
---

::u-page-hero{orientation="horizontal"}
#default
:img-logo

#headline
:last-release{:as-badge=true}

#title
:text-bundle-name

#description
**:vars{n="project"}** es una aplicación de escritorio, construida con **Tauri** y **Vue**, que te permite **desplegar y administrar tus sitios web** mediante **SSH/SFTP**, manteniendo el control de los datos en una **base de datos local**.

#links
  :::u-button
  ---
  color: neutral
  size: xl
  to: /getting-started/installation
  trailing-icon: i-tabler-arrow-right
  ---
  Empezar
  :::

:button-star-on-github
::

::u-page-c-t-a{orientation="horizontal" :reverse="true"}
#title
Apóyame

#description
  ::note
  **Apóyame** 🩵 Si te gusta este proyecto, dale una 🌟 y compártelo con tus amigos.
  ::

#default
:svg-ship{width="320" height="364" alt="Ilustración" class="w-full rounded-lg"}

#links
  :::u-button
  ---
  icon: i-simple-icons-paypal
  to: https://www.paypal.me/idmarinas
  target: _blank
  ---
  Ayuda a mis proyectos
  :::

  :::u-button
  ---
  icon: i-simple-icons-github
  color: sponsor
  to: https://github.com/sponsors/idmarinas
  target: _blank
  ---
  Espónsor
  :::
::

::u-page-section
#title
Todo lo que necesitas para gestionar tus servidores desde el escritorio.

#features
  :::u-page-feature
  ---
  icon: i-tabler-server
  ---
  #title
  Gestión de hosts

  #description
  Test de conexión, métricas del sistema, actualizaciones y estado de cada host SSH.
  :::

  :::u-page-feature
  ---
  icon: i-tabler-terminal-2
  ---
  #title
  Consola remota

  #description
  Ejecuta comandos SSH/SFTP con salida en streaming, transfiere archivos y cancela tareas en curso.
  :::

  :::u-page-feature
  ---
  icon: i-tabler-shield-lock
  ---
  #title
  Credenciales cifradas

  #description
  Las contraseñas y claves privadas SSH se cifran con AES-256-GCM mediante claves versionadas en el vault Stronghold y el keychain del sistema.
  :::

  :::u-page-feature
  ---
  icon: i-tabler-database
  ---
  #title
  Base de datos local

  #description
  SQLite local gestionado con Drizzle ORM: tus datos nunca salen de tu equipo.
  :::
::
