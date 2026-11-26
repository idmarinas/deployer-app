import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'File manager',
	tabs: {
		files: 'Files',
		transfers: 'Transfers',
	},
	actions: {
		upload: 'Upload to server',
		download: 'Download to computer',
		upload_hint: 'Select files in the local panel and choose a server.',
		download_hint: 'Select files in the remote panel and choose a local folder.',
	},
} satisfies LocaleMessageValue
