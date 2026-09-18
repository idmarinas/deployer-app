# Plan: Comando Remoto Universal (tipo n8n)

**Estado: COMPLETADO** — el usuario da este plan por completado y continúa con la versión "guardada y mantenida en BD" (ver `AGENTS.remote-nodes-db.PLAN.md`).

## Resumen

Hacer que el comando `ssh_execute_command` sea universal y reutilizable, capaz de ejecutar cualquier comando en un servidor remoto y devolver la salida formateada. Esto elimina la necesidad de crear comandos Tauri Rust específicos para cada función (como `host_check_system_info`, `host_check_updates`, etc.). Se crea una abstracción de "nodos" que permiten definir comandos con su lógica de parseo de salida.

---

## Instrucciones dadas

> El comando remote `src-tauri\src\commands\remote\*` tiene que ser un comando universal, es decir, tiene que poder ejecutar cualquier comando se que le pase. Esto es igual que el nodo command de n8n.
>
> Se tiene que poder crear una especie de "nodos" que permitan ejecutar un comando en el servidor y capturar la salida.
>
> He probado el siguiente comando [script bash de métricas]: El resultado es que sale el mensaje de que se ejecuto correctamente, pero en la salida, no muestra nada.
>
> El comando, tiene que permitir formatear el resultado, según unos formatos ya establecidos y personalizados:
>
> 1. La salida va a ser un json, pues aplicarle el formato json a ese resultado.
> 2. Poder aplicarle un script que parsea el output. Por ejemplo un script que parsea los resultados de la salida de `apt list --upgradable`.
> 3. Es decir hacer que el comando `src-tauri\src\commands\remote\*` sea muy reutilizable.
> 4. Esto permite el tener que crear comandos tauri en rust para funciones concretas (como por ejemplo el comando que comprueba actualizaciones.)

---

## Diagnóstico del bug actual (salida vacía)

El script bash de métricas funciona en la consola SSH directa pero no produce salida a través de `ssh_execute_command`. Causa probable: el script usa `bash -c '...'` con comillas anidadas y la expansión de variables `$idle_delta`, `$total_delta` dentro de `awk "BEGIN {printf ...}"` puede estar siendo interpretada por el shell local antes de enviarse por SSH, o el output se acumula en el chunk buffer sin emitirse porque el script tarda > timeout en producir la primera línea (el `sleep 1` + cálculos).

---

## Decisiones

| Decisión | Elección | Razón |
| --- | --- | --- |
| Backend universal | Mantener `ssh_execute_command` como está (ya ejecuta cualquier cmd) | No necesita cambios Rust para ejecución |
| Formateo de salida | Lógica en **frontend** (TypeScript) | Flexibilidad máxima, sin recompilar Rust |
| Sistema de nodos | Definiciones TypeScript en `src/utils/remote-nodes/` | Cada nodo = { comando, parser, schema de salida } |
| Parseo de salida | Tipos: `json`, `line-based`, `regex`, `raw` | Cubre todos los casos (apt list, métricas, etc.) |
| Migración gradual | Nodos reemplazan comandos Rust existentes uno a uno | Sin breaking changes |
| Persistencia de resultados | Los nodos que reemplazan `host_check_*` siguen guardando en BD | Compatibilidad con UI existente |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (TypeScript)                 │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │  Node Defs    │    │  Node Runner │    │  Parsers  │  │
│  │  (comando +   │───▶│  (invoke     │───▶│  (json,   │  │
│  │   parser cfg) │    │   ssh_exec)  │    │   line,   │  │
│  └──────────────┘    └──────────────┘    │   regex)  │  │
│                                          └───────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │ invoke('remote:ssh_execute_command')
                           ▼
┌─────────────────────────────────────────────────────────┐
│               Backend (Rust) — sin cambios               │
│  ssh_execute_command → ejecuta CUALQUIER comando SSH     │
│  Devuelve: { exit_code, output, duration_seconds }      │
└─────────────────────────────────────────────────────────┘
```

---

## Estructura de un Nodo

```typescript
// src/utils/remote-nodes/types.ts
interface RemoteNodeDefinition {
  /** Identificador único del nodo */
  id: string
  /** Nombre legible */
  name: string
  /** Descripción */
  description: string
  /** Comando bash a ejecutar en el servidor */
  command: string
  /** Configuración del parser de salida */
  parser: OutputParser
  /** Schema TS del resultado parseado */
  resultSchema?: ZodSchema
  /** Timeout personalizado (default: 300s) */
  timeout_secs?: number
}

type OutputParser =
  | { type: 'json' }                          // parsea output como JSON
  | { type: 'line-based', rules: LineRule[] }  // reglas por línea
  | { type: 'regex', patterns: RegexPattern[] } // extracción por regex
  | { type: 'raw' }                            // sin parseo, devuelve string

interface LineRule {
  /** Pattern que matchea la línea (string o regex) */
  match: string | RegExp
  /** Clave del resultado */
  key: string
  /** Transformación del valor */
  transform?: 'string' | 'number' | 'boolean'
}

interface RegexPattern {
  /** Regex con grupos de captura */
  pattern: RegExp
  /** Mapeo de grupos a claves del resultado */
  groups: Record<string, number>  // { "cpu_usage": 1, "ram_usage": 2 }
}
```

---

## Nodos predefinidos (reemplazan comandos Rust)

### 1. `system-metrics` (reemplaza `host_check_metrics`)

```typescript
{
  id: 'system-metrics',
  name: 'Métricas del sistema',
  command: `bash -c '
    read cpu user nice system idle iowait irq softirq steal < /proc/stat
    sleep 1
    read cpu2 user2 nice2 system2 idle2 iowait2 irq2 softirq2 steal2 < /proc/stat
    idle_delta=$((idle2 - idle))
    total1=$((user + nice + system + idle + iowait + irq + softirq))
    total2=$((user2 + nice2 + system2 + idle2 + iowait2 + irq2 + softirq2))
    total_delta=$((total2 - total1))
    cpu_usage=$(awk "BEGIN {printf \\"%.2f\\", (1 - $idle_delta / $total_delta) * 100}")
    ram_usage=$(free -b | awk "NR==2 {printf \\"%.2f\\", (1 - \\$7/\\$2) * 100}")
    disk_usage=$(df / --output=used,size | awk "NR==2 {printf \\"%.2f\\", (\\$1/\\$2) * 100}")
    uptime_seconds=$(awk "{print int(\$1)}" /proc/uptime)
    printf "{\\"cpu\\":%s,\\"ram\\":%s,\\"disk\\":%s,\\"uptime\\":%s}" "$cpu_usage" "$ram_usage" "$disk_usage" "$uptime_seconds"
  '`,
  parser: { type: 'json' },
  resultSchema: z.object({
    cpu: z.number(),
    ram: z.number(),
    disk: z.number(),
    uptime: z.number(),
  }),
}
```

### 2. `system-info` (reemplaza `host_check_system_info`)

```typescript
{
  id: 'system-info',
  name: 'Información del sistema',
  command: `bash -c '
    kernel=$(uname -r)
    arch=$(uname -m)
    cores=$(nproc 2>/dev/null || echo 0)
    mem_total=$(free -b | awk "NR==2 {print \$2}")
    disk_total=$(df / --output=size | awk "NR==2 {print \$1}")
    os_name=$(awk -F= "/^NAME=/ {print \$2}" /etc/os-release 2>/dev/null | tr -d "\\"")
    os_version=$(awk -F= "/^VERSION_ID=/ {print \$2}" /etc/os-release 2>/dev/null | tr -d "\\"")
    distro=$(awk -F= "/^PRETTY_NAME=/ {print \$2}" /etc/os-release 2>/dev/null | tr -d "\\"")
    pkg_manager="unknown"
    command -v apt >/dev/null 2>&1 && pkg_manager="apt"
    command -v yum >/dev/null 2>&1 && pkg_manager="yum"
    command -v dnf >/dev/null 2>&1 && pkg_manager="dnf"
    command -v pacman >/dev/null 2>&1 && pkg_manager="pacman"
    printf "{\\"kernel\\":\\"%s\\",\\"arch\\":\\"%s\\",\\"cores\\":%s,\\"mem_total\\":\\"%s\\",\\"disk_total\\":\\"%s\\",\\"os_name\\":\\"%s\\",\\"os_version\\":\\"%s\\",\\"distro\\":\\"%s\\",\\"pkg_manager\\":\\"%s\\"}" "$kernel" "$arch" "$cores" "$mem_total" "$disk_total" "$os_name" "$os_version" "$distro" "$pkg_manager"
  '`,
  parser: { type: 'json' },
}
```

### 3. `upgradable-packages` (reemplaza `host_check_updates`)

```typescript
{
  id: 'upgradable-packages',
  name: 'Paquetes actualizables',
  command: 'apt list --upgradable 2>/dev/null || yum check-update 2>/dev/null || dnf check-update 2>/dev/null',
  parser: {
    type: 'line-based',
    rules: [
      // apt: "package_name/arch, version, platform (priority)"
      { match: /^([^/]+)\/\S+\s+(\S+)/, key: 'packages', transform: 'string' },
    ],
  },
  // O mejor: usar regex con groups
  parser: {
    type: 'regex',
    patterns: [{
      pattern: /^([^/\s]+)\/\S+\s+(\S+)/gm,
      groups: { name: 1, version: 2 },
    }],
  },
}
```

### 4. `custom` (nodo ad-hoc para comandos libres)

```typescript
{
  id: 'custom',
  name: 'Comando personalizado',
  command: '',  // se proporciona en runtime
  parser: { type: 'raw' },  // o 'json' si se espera JSON
}
```

---

## Cambios necesarios

### Archivos a crear

| Archivo | Propósito |
| --- | --- |
| `src/utils/remote-nodes/types.ts` | Tipos `RemoteNodeDefinition`, `OutputParser`, etc. |
| `src/utils/remote-nodes/registry.ts` | Registro de nodos predefinidos |
| `src/utils/remote-nodes/parsers.ts` | Funciones de parseo (json, line-based, regex, raw) |
| `src/utils/remote-nodes/runner.ts` | Función `runNode(nodeId, hostId, params?)` que invoca `ssh_execute_command` + parsea |
| `src/utils/remote-nodes/nodes/system-metrics.ts` | Nodo de métricas |
| `src/utils/remote-nodes/nodes/system-info.ts` | Nodo de info del sistema |
| `src/utils/remote-nodes/nodes/upgradable-packages.ts` | Nodo de paquetes actualizables |
| `src/utils/remote-nodes/nodes/custom.ts` | Nodo ad-hoc |

### Archivos a modificar

 Ninguno por ahora — se construye el sistema de nodos sin tocar el código existente.

### Archivos Rust (sin cambios)

`ssh_execute_command` ya es universal. No necesita modificaciones.

---

## Orden de implementación

1. **Crear sistema de tipos y parsers** (`types.ts`, `parsers.ts`)
2. **Crear nodo `system-metrics`** y testear que el bug de salida vacía se resuelve
3. **Crear nodo `system-info`**
4. **Crear nodo `upgradable-packages`**
5. **Crear `runner.ts`** (orquesta ejecución + parseo)
6. **Crear `registry.ts`** (registro central de nodos)

---

## Estado de implementación

El sistema de nodos en TypeScript está **implementado completo**:

- `src/utils/remote-nodes/types.ts` — `RemoteNodeDefinition`, `OutputParser`, `LineRule`, `RegexPattern`, `NodeRunResult`.
- `src/utils/remote-nodes/parsers.ts` — `parseOutput` con `json`, `line-based`, `regex` y `raw`.
- `src/utils/remote-nodes/runner.ts` — `runNode(nodeId, hostId, options?)` y `runCustomNode(command, hostId, options?)`; invoca `ssh_execute_command` con `Channel` y parsea la salida.
- `src/utils/remote-nodes/registry.ts` — registro central con `getNode` / `getAllNodes` / `register_node`... (implementado `getNode` / `getAllNodes`).
- `src/utils/remote-nodes/nodes/system-metrics.ts` — nodo `system-metrics` (parser json, comando de métricas CPU/RAM/disco/uptime, `timeout_secs: 30`).
- `src/utils/remote-nodes/nodes/system-info.ts` — nodo `system-info` (parser json, info SO/kernel/gestor paquetes, `timeout_secs: 30`).
- `src/utils/remote-nodes/nodes/upgradable-packages.ts` — nodo `upgradable-packages` (parser regex, `apt/yum/dnf --upgradable`, `timeout_secs: 60`).
- `src/utils/remote-nodes/nodes/custom.ts` — `createCustomNode(command, parser, options?)` para comandos libres.

**Integración piloto** en `src/pages/dashboard/hosts/[id]/(view).vue`: `checkMetrics()` ya no invoca `host_check_metrics`; usa `runNode('system-metrics', hostId)`, mapea el resultado a `HostStatusMetrics`, persiste con `db.update(deployer_hosts)` y refresca la caché.

**Pendiente / decisión del usuario:** el usuario prefiere que los nodos **vivan en la BD** (lista reutilizable y personalizable) en lugar de hardcodeados en el código TS. → Plan `AGENTS.remote-nodes-db.PLAN.md`.
