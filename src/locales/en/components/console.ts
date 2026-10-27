import type { LocaleMessageValue } from 'vue-i18n'

export default {
	host: {
		label: 'Server',
		placeholder: 'Select a server',
		required: 'Select a server to run remote operations.',
	},
	command: {
		command_placeholder: 'Command to run (e.g. ls -la)',
		working_dir_placeholder: 'Working directory',
		timeout_placeholder: 'Timeout (s)',
		run: 'Run',
	},
	upload: {
		local_placeholder: 'Local path (or select)',
		remote_placeholder: 'Destination remote path',
		browse_file: 'File',
		browse_dir: 'Folder',
		recursive: 'Directory (recursive)',
		chmod_placeholder: 'chmod (e.g. 755, optional)',
		submit: 'Upload',
	},
	download: {
		remote_placeholder: 'Remote path to download',
		local_placeholder: 'Save to (optional, content returned if empty)',
		browse: 'Save to…',
		recursive: 'Directory (recursive)',
		submit: 'Download',
	},
	console: {
		title: 'Output',
		placeholder: 'The output of operations will appear here.',
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
		failed: 'Operation failed. \nReason: {reason}',
	},
} satisfies LocaleMessageValue
