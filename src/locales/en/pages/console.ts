import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Remote console',
	host: {
		label: 'Host',
		placeholder: 'Select a host',
		required: 'Select a host to run remote operations.',
	},
	sections: {
		command: 'Run command',
		upload: 'Upload file',
		download: 'Download file',
	},
	command: {
		command_placeholder: 'command to run (e.g. ls -la)',
		working_dir_placeholder: 'working directory (optional)',
		timeout_placeholder: 'Timeout (s)',
		run: 'Run',
	},
	upload: {
		local_placeholder: 'local path (or select)',
		remote_placeholder: 'remote destination path',
		browse_file: 'File',
		browse_dir: 'Folder',
		recursive: 'Directory (recursive)',
		chmod_placeholder: 'chmod (e.g. 755, optional)',
		submit: 'Upload',
	},
	download: {
		remote_placeholder: 'remote path to download',
		local_placeholder: 'save to (optional, content is fetched if left empty)',
		browse: 'Save to…',
		recursive: 'Directory (recursive)',
		submit: 'Download',
	},
	console: {
		title: 'Output',
		placeholder: 'The output of the operations will appear here.',
		clear: 'Clear',
		cancel: 'Cancel',
		exit_code: 'Exit code: {code}',
		running: 'Running…',
		error: 'Error: {message}',
	},
	feedback: {
		executed: 'Command executed successfully.',
		uploaded: 'Files uploaded successfully.',
		downloaded: 'Files downloaded successfully.',
		saved_to: 'File saved to {path}',
		failed: 'The operation failed. \nReason: {reason}',
	},
} satisfies LocaleMessageValue