import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: {
		add: 'Add command',
		edit: 'Edit command',
	},
	key: {
		label: 'Key',
		help: 'Unique identifier of the command (auto-generated from the name)',
		hint: 'Only lowercase letters, numbers and underscores. Cannot be changed when editing.',
	},
	name: {
		label: 'Name',
		help: 'Unique name that identifies the command',
	},
	description: {
		label: 'Description',
		help: 'Optional description to remember the purpose of the command',
	},
	command: {
		label: 'Command',
		help: 'Bash command that will run on the remote server via SSH',
		placeholder: '# e.g. uptime -p',
	},
	variables: {
		help: 'Global variables and parameters available in the editor',
		tips: {
			scopes: 'available scopes',
			root: 'all variables',
			path: 'all global variables',
			filter_path: 'matches by path',
			filter_slug: 'matches by slug',
			params: 'command parameters',
			escape: 'leave the expression as-is',
		},
		secret_help: 'Secret variables are marked in amber and are only resolved when the command runs.',
		empty_value: 'no value',
	},
	parser: {
		label: 'Output parser',
		help: 'How the command output is interpreted to display and reuse it',
		select: {
			raw: {
				label: 'No parsing',
				description: 'Returns the raw output (unprocessed text).',
			},
			json: {
				label: 'JSON',
				description: 'Parses the output as JSON (object or array).',
			},
			line_based: {
				label: 'Lines (rules)',
				description: 'Extracts values with regex rules applied line by line.',
			},
			regex: {
				label: 'Regular expressions',
				description: 'Extracts capture groups with global regex patterns.',
			},
		},
		json_placeholder: 'JSON configuration of the parser (line-based or regex)',
		invalid: 'The parser JSON configuration is not valid.',
	},
	timeout: {
		label: 'Timeout',
		help: 'Maximum execution time in seconds (default 300)',
	},
	inputs: {
		title: 'Input parameters',
		help: 'Values requested before running and replaced in the script with the params.key expression',
		parameter: 'Parameter',
		empty: 'This command has no input parameters.',
		add: 'Add parameter',
		key: {
			label: 'Key',
			help: 'Name used in the script as params.key',
			placeholder: 'remote_dir',
		},
		label: {
			label: 'Label',
			placeholder: 'Remote directory',
		},
		type: {
			label: 'Type',
			text: 'Text',
			number: 'Number',
			boolean: 'Boolean',
			select: 'Select',
		},
		required: {
			label: 'Required',
			help: 'Prevents running without a value',
		},
		default: {
			label: 'Default value',
			help: 'Literal or global variable (global.slug). Secrets are not allowed.',
			placeholder: 'Empty or global.deploy_path',
			resolved: 'Current value:',
		},
		field_help: {
			label: 'Help',
			placeholder: 'Text shown next to the field when running',
		},
		options: {
			title: 'Options',
			add: 'Add option',
			label: 'Label',
			value: 'Value',
			empty: 'No options: add at least one to be able to save.',
			remove: 'Remove option',
		},
		actions: {
			move_up: 'Move up',
			move_down: 'Move down',
			remove: 'Remove parameter',
		},
	},
} satisfies LocaleMessageValue
