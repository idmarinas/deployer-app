// theme/dashboardSidebar.ts
// Estilo PCB: panel de control técnico. Header/footer con traza energizada,
// handle de resize que se convierte en pista de circuito al hacer hover.
export default {
	slots: {
		root: 'flex flex-col h-full bg-(--ui-bg)/80 backdrop-blur-md border-r border-(--ui-border) relative',
		header: [
			'h-16 flex items-center px-4 border-b border-(--ui-border) relative',
			'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px',
			'after:bg-linear-to-r after:from-primary-500 after:to-secondary-500 after:opacity-40',
		].join(' '),
		body: 'flex-1 overflow-y-auto p-4 space-y-4',
		footer: [
			'p-4 border-t border-(--ui-border) flex flex-col gap-2 relative',
			'after:absolute after:top-0 after:left-0 after:right-0 after:h-px',
			'after:bg-linear-to-r after:from-primary-500 after:to-secondary-500 after:opacity-40',
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
