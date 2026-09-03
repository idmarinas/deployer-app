// theme/dashboardSidebar.ts — Panel lateral Command Module
export default {
	slots: {
		root: [
			'flex flex-col h-full backdrop-blur-md border-r border-(--ui-border) relative',
			'bg-(--ui-bg)/80 pcb-panel-grid',
		].join(' '),
		header: [
			'h-16 flex items-center px-4 border-b border-(--ui-border) relative',
			'pcb-trace-brand-bottom',
		].join(' '),
		body: 'flex-1 overflow-y-auto p-4 space-y-4',
		footer: [
			'p-4 border-t border-(--ui-border) flex flex-col gap-2 relative',
			'pcb-bracket-br-sm pcb-trace-brand-top',
		].join(' '),
		handle: [
			'w-px hover:w-[3px] bg-(--ui-border)',
			'hover:bg-linear-to-b hover:from-primary-500 hover:to-secondary-500',
			'transition-all duration-200 cursor-col-resize relative z-10',
		].join(' '),
		content: 'flex flex-col h-full',
		overlay: 'fixed inset-0 bg-(--ui-bg)/40 backdrop-blur-sm z-40',
	},
}
