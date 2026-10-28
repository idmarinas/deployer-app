import { Command } from '@/types/entities'
import { ComposerTranslation } from 'vue-i18n'

export const commands = (t: ComposerTranslation): Omit<Command, 'deleted_at'>[] => [
	{
		key: 'system_metrics',
		name: t('seed.commands.system_metrics.name'),
		description: {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: t('seed.commands.system_metrics.description') }],
				},
			],
		},
		command: `bash -c '
read cpu user nice system idle iowait irq softirq steal < /proc/stat
sleep 1
read cpu2 user2 nice2 system2 idle2 iowait2 irq2 softirq2 steal2 < /proc/stat

idle_delta=$((idle2 - idle))
total1=$((user + nice + system + idle + iowait + irq + softirq))
total2=$((user2 + nice2 + system2 + idle2 + iowait2 + irq2 + softirq2))
total_delta=$((total2 - total1))

if [ "$total_delta" -gt 0 ]; then
  cpu_usage=$(awk "BEGIN {printf \"%.2f\", (1 - $idle_delta / $total_delta) * 100}")
else
  cpu_usage="0.00"
fi

ram_usage=$(free -b 2>/dev/null | awk "NR==2 {printf \"%.2f\", (1 - \$7/\$2) * 100}")

disk_usage=$(df / --output=used,size 2>/dev/null | awk "NR==2 {printf \"%.2f\", (\$1/\$2) * 100}")

uptime_out=$(uptime -p 2>/dev/null || uptime)

esc() { printf "%s" "$1" | sed "s/\\\\/\\\\\\\\/g; s/\"/\\\\\"/g"; }

printf "{\"cpu\":\"%s\",\"ram\":\"%s\",\"disk\":\"%s\",\"uptime\":\"%s\"}" \
  "$cpu_usage" "$ram_usage" "$disk_usage" "$(esc "$uptime_out")"
'`,
		custom: false,
		enabled: true,
		internal: true,
		parser: { type: 'json' },
		timeout: 30,
		updated_at: new Date().toISOString(),
		created_at: new Date().toISOString(),
	},
	{
		key: 'system_info',
		name: t('seed.commands.system_info.name'),
		description: {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: t('seed.commands.system_info.description') }],
				},
			],
		},
		command: `bash -c '
esc() { printf "%s" "$1" | sed "s/\\\\/\\\\\\\\/g; s/\"/\\\\\"/g"; }

kernel=$(uname -r 2>/dev/null)
arch=$(uname -m 2>/dev/null)
cores=$(nproc 2>/dev/null || echo 1)
mem_total=$(free -b 2>/dev/null | awk "NR==2 {print \$2}")
disk_total=$(df -B1 / 2>/dev/null | awk "NR==2 {print \$2}")

os_release=""
dist=""
if [ -f /etc/os-release ]; then
  os_release=$(grep -E "^(PRETTY_NAME|VERSION)=" /etc/os-release 2>/dev/null | head -2 | tr "\n" " ")
  dist=$(grep "^PRETTY_NAME=" /etc/os-release 2>/dev/null | cut -d"\"" -f2)
fi

pm="unknown"
pm_ver=""
for p in apt yum dnf; do
  if command -v "$p" >/dev/null 2>&1; then
    pm="$p"
    pm_ver=$("$p" --version 2>/dev/null | head -1)
    break
  fi
done

printf "{\"kernel\":\"%s\",\"arch\":\"%s\",\"cores\":\"%s\",\"memory_total\":\"%s\",\"disk_total\":\"%s\",\"os_release\":\"%s\",\"distribution\":\"%s\",\"package_manager\":\"%s\",\"package_manager_version\":\"%s\"}" \
  "$(esc "$kernel")" "$(esc "$arch")" "$(esc "$cores")" \
  "$(esc "$mem_total")" "$(esc "$disk_total")" \
  "$(esc "$os_release")" "$(esc "$dist")" "$(esc "$pm")" "$(esc "$pm_ver")"
'`,
		custom: false,
		enabled: true,
		internal: true,
		parser: { type: 'json' },
		timeout: 30,
		updated_at: new Date().toISOString(),
		created_at: new Date().toISOString(),
	},
	{
		key: 'upgradable_packages',
		name: t('seed.commands.upgradable_packages.name'),
		description: {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: t('seed.commands.upgradable_packages.description') }],
				},
			],
		},
		command: `apt list --upgradable 2>/dev/null || yum check-update 2>/dev/null || dnf check-update 2>/dev/null`,
		custom: false,
		enabled: true,
		internal: true,
		parser: {
			type: 'regex',
			patterns: [
				{
					pattern: '^\\s*([^/\\s]+)/(\\S+)\\s+(\\S+)\\s+\\S+\\s+\\[[^\\]]*upgradable to:\\s*(\\S+)\\s*\\]',
					flags: 'gm',
					groups: { name: 1, repo: 2, current_version: 3, available_version: 4 },
				},
				{
					pattern:
						'^\\s*(?!(?:Package|Arch|Version|Repo|Loaded|Last)\\s)([^*/\\s]+)\\s+(?:\\S+\\s+)?(\\S+)\\s+(\\S+)\\s*$',
					flags: 'gm',
					groups: { name: 1, available_version: 2, repo: 3 },
				},
			],
		},
		timeout: 60,
		updated_at: new Date().toISOString(),
		created_at: new Date().toISOString(),
	},
]

export default commands
