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
} satisfies LocaleMessageValue