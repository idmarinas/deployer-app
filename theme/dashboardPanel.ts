// Panel principal del dashboard — Command Module.
export default {
	slots: {
		root: [
			'flex flex-col h-full relative',
			'bg-(--ui-bg) pcb-panel-grid',
		].join(' '),
		body: '@container flex-1 overflow-y-auto p-4 sm:p-6',
		header: [
			'px-4 sm:px-6 py-3 border-b border-(--ui-border) relative pcb-trace-brand-bottom',
		].join(' '),
		footer: [
			'px-4 sm:px-6 py-3 border-t border-(--ui-border) relative pcb-trace-brand-top',
		].join(' '),
	},
}
