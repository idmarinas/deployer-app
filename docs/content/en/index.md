---
title: {{project_name}}
description: DeployerApp is a desktop application to deploy and manage your websites via SSH/SFTP, with encrypted credentials and full control of your data in a local database.
# Aditional for Docs only
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
**DeployerApp** is a desktop application, built with **Tauri** and **Vue**, that lets you **deploy and manage your websites** over **SSH/SFTP**, keeping full control of your data in a **local database**.

#links
  :::u-button
  ---
  color: neutral
  size: xl
  to: /getting-started/installation
  trailing-icon: i-tabler-arrow-right
  ---
  Get started
  :::

:button-star-on-github
::

::u-page-c-t-a{orientation="horizontal" :reverse="true"}
#title
Support me

#description
  ::note
  **Support me** 🩵 If you like this project, give it a 🌟 and share it with your friends.
  ::

#default
:svg-ship{width="320" height="364" alt="Illustration" class="w-full rounded-lg"}

#links
  :::u-button
  ---
  icon: i-simple-icons-paypal
  to: https://www.paypal.me/idmarinas
  target: _blank
  ---
  Support my projects
  :::

  :::u-button
  ---
  icon: i-simple-icons-github
  color: purple
  to: https://github.com/sponsors/idmarinas
  target: _blank
  ---
  Sponsor
  :::
::

::u-page-section
#title
Everything you need to manage your servers from your desktop.

#features
  :::u-page-feature
  ---
  icon: i-tabler-server
  ---
  #title
  Host management

  #description
  Connection tests, system metrics, updates and status for each SSH host.
  :::

  :::u-page-feature
  ---
  icon: i-tabler-terminal-2
  ---
  #title
  Remote console

  #description
  Run SSH/SFTP commands with streaming output, transfer files and cancel running tasks.
  :::

  :::u-page-feature
  ---
  icon: i-tabler-shield-lock
  ---
  #title
  Encrypted credentials

  #description
  SSH passwords and private keys are encrypted with AES-256-GCM using versioned keys in the Stronghold vault and the system keychain.
  :::

  :::u-page-feature
  ---
  icon: i-tabler-database
  ---
  #title
  Local database

  #description
  Local SQLite managed with Drizzle ORM: your data never leaves your machine.
  :::
::