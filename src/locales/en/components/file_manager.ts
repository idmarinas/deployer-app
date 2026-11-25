import type { LocaleMessageValue } from 'vue-i18n'

export default {
	panel: {
		local: 'Local computer',
		remote: 'Remote server',
	},
	root: {
		select: 'Choose folder',
		local_hint: 'Choose a local folder to get started.',
		remote_hint: 'Select a server to browse its files.',
		reset: 'Reset path',
		reset_hint: 'Go back to this server’s base directory',
	},
	refresh: 'Refresh',
	loading: 'Loading…',
	empty: 'This folder is empty.',
	entry: {
		open: 'Open folder',
		expand: 'Expand one level',
		collapse: 'Collapse one level',
		select: 'Select',
		deselect: 'Deselect',
		partial: 'Partial listing',
		limit_reached: 'The loading limit was reached; only the loaded levels were selected.',
	},
	errors: {
		load: 'Could not load the directory.',
		read_local: 'Could not read “{path}”: {reason}',
	},
	queue: {
		title: 'Transfers',
		empty: 'No transfers in the queue.',
		summary: '{completed} of {total} completed · {bytes} transferred',
		cancel: 'Cancel item',
		clear: 'Clear finished',
		files: '{count} files',
		retry: 'Retry',
		retry_unavailable: 'The server is no longer available',
		no_files: 'No file details',
		concurrency: 'Up to {count} at a time',
		concurrency_label: 'Simultaneous transfers',
	},
	status: {
		pending: 'Pending',
		running: 'Running',
		success: 'Completed',
		error: 'Error',
		cancelled: 'Cancelled',
		skipped: 'Skipped',
		interrupted: 'Interrupted',
	},
	direction: {
		upload: 'Upload',
		download: 'Download',
	},
	mark: {
		downloaded: 'Downloaded',
	},
} satisfies LocaleMessageValue
