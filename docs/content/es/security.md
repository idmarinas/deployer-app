---
title: Política de Seguridad
description: Cómo protege {{project_name}} tus credenciales SSH y cómo notificar vulnerabilidades
navigation: false
ogImage:
  props:
    icon: i-tabler-shield-check
---

::note
**:vars{n="project"}** es una aplicación de escritorio local: los datos no salen de tu equipo y no intervienen servidores intermedios. Esta página describe cómo se protegen las credenciales y cómo notificar problemas de seguridad.
::

## Cifrado de credenciales

Los datos de acceso SSH más sensibles se almacenan **cifrados en la base de datos local** (SQLite). Son susceptibles de cifrado la contraseña de conexión SSH de cada host y la clave privada con su passphrase.

El cifrado usa **AES-256-GCM** con un nonce aleatorio de 12 bytes por operación. Así funciona el flujo:

1. El **frontend** opera siempre con texto plano y es el **único escritor** del vault: cifra los datos al guardar y los descifra o enmascara al leer.
2. Los valores cifrados se persisten con el prefijo `ENC:{version}:<base64>`.
3. El **backend Rust** abre el vault en modo **solo lectura** para descifrar las credenciales cuando establece la conexión SSH/SFTP.

## Vault de Stronghold

- El vault (`vault.hold`) se guarda en el directorio de datos local de la aplicación, junto con el *salt* de 32 bytes.
- La **contraseña del vault** se genera aleatoriamente (64 caracteres hexadecimales) en la primera ejecución y se persiste en el **keychain del sistema operativo** mediante el crate `keyring`.
- La clave del vault se deriva con **Argon2** a partir de la contraseña y del *salt*.
- Las claves de cifrado son **versionadas** por campo (`encrypt:{tabla}.{col}:{version}`): al rotar una clave se conservan las versiones anteriores y los datos cifrados con versiones viejas se pueden re-cifrar con la versión actual sin pérdida de información.

## Versiones soportadas

No todas las ramas de este proyecto están soportadas. Para saber cuáles sí y cuáles no, consulta la siguiente tabla:

:list-branch-security

## Reportar una vulnerabilidad

1) Si el fallo está causado por una de las dependencias del proyecto ([Tauri](https://tauri.app), [russh](https://github.com/Eugeny/russh), [sqlx](https://github.com/launchbadge/sqlx), etc.), repórtalo primero al proyecto correspondiente siguiendo sus directrices de seguridad.

2) Si encuentras una vulnerabilidad en **:vars{n="project"}**, repórtala de forma **privada** mediante la herramienta que GitHub proporciona en :vars{n="security_advisories_url" text="Security > Advisories"}.

3) No publiques información sensible sobre vulnerabilidades en GitHub Issues hasta que el fallo haya sido corregido y liberado un parche.