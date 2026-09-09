import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Hosts',
	table: {
		columns: {
			name: 'Name',
			ip: 'IP',
			port: 'Port',
			auth_type: 'Authentication type',
			enabled: 'Enabled',
			created_at: 'Created',
		},
		dropdown: {
			test_connection: 'Test connection',
			manage: 'Manage',
		},
	},
	manage: {
		title: {
			updates: 'Updates',
			metrics: 'Host status',
			server_info: 'Host information',
		},
		metrics: {
			cpu_usage: 'CPU usage',
			ram_usage: 'RAM usage',
			disk_usage: 'Disk usage',
		},
		actions_title: 'Actions',
		test_connection: 'Test connection',
		check_status: 'Check status',
		check_updates: 'Check for updates',
		updates_summary: 'Total: {total} - Security: {security} - Major: {major} - Minor: {minor} - Patch: {patch}',
		update_selected: 'Update selected ({count})',
		update_all: 'Update all ({count})',
		update_package: 'Update package',
		no_updates: 'The system is up to date',
		edit: 'Edit',
		output_title: 'Output',
		distribution: 'Distribution',
		kernel: 'Kernel',
		arch: 'Architecture',
		package_manager: 'Package manager',
		uptime: 'Uptime',
		cpu_cores: 'CPU',
		memory: 'Memory (usage)',
		memory_total: 'Total memory',
		disk: 'Disk (usage)',
		disk_total: 'Total disk',
		memory_usage: 'Memory (usage)',
		disk_usage: 'Disk (usage)',
		column_package: 'Package',
		column_current: 'Current',
		column_available: 'New',
		column_type: 'Type',
		column_actions: '',
		select_all: 'Select all',
		deselect_all: 'Deselect all',
		use_sudo: 'Use sudo',
	},
	toast: {
		update_packages: {
			loading: {
				title: 'Updating packages',
				description: 'Updating the packages on: {name}',
			},
			success: {
				title: 'Packages updated',
				description: 'The packages have been updated successfully on: {name}',
			},
			error: {
				title: 'Update error',
				description: 'The packages could not be updated on: {name}. \nReason: {reason}',
			},
		},
		delete: {
			loading: {
				title: 'Deleting host',
				description: 'Deleting the host: {name}',
			},
			success: {
				title: 'Host deleted successfully',
				description: 'The host has been deleted: {name}',
			},
			error: {
				title: 'Error deleting the host',
				description: 'The host could not be deleted: {name}. \nReason: {reason}',
			},
		},
	},
} satisfies LocaleMessageValue