// theme/dashboardSidebar.ts
// Estilo "Command Module": panel de control lateral con dot-grid de instrumentos,
// L-brackets en header/footer, handle tipo conector de circuito.
export default {
	slots: {
		root: [
			'flex flex-col h-full backdrop-blur-md border-r border-(--ui-border) relative',
			'bg-(--ui-bg)/80',
			'bg-[radial-gradient(circle_at_1px_1px,rgba(10,141,255,0.03)_1px,transparent_0)] bg-[size:20px_20px]',
		].join(' '),
		header: [
			'h-16 flex items-center px-4 border-b border-(--ui-border) relative',
			'before:absolute before:bottom-0 before:left-0 before:right-0 before:h-px',
			'before:bg-linear-to-r before:from-primary-500 before:to-secondary-500 before:opacity-40',
			// Top-left L-bracket
			'after:absolute after:top-[6px] after:left-[6px]',
			'after:size-[10px]',
			'after:border-t-2 after:border-l-2',
			'after:border-t-primary-500/40 after:border-l-primary-500/40',
			'after:rounded-tl-[1px]',
		].join(' '),
		body: 'flex-1 overflow-y-auto p-4 space-y-4',
		footer: [
			'p-4 border-t border-(--ui-border) flex flex-col gap-2 relative',
			'before:absolute before:top-0 before:left-0 before:right-0 before:h-px',
			'before:bg-linear-to-r before:from-primary-500 before:to-secondary-500 before:opacity-40',
			// Bottom-right L-bracket
			'after:absolute after:bottom-[6px] after:right-[6px]',
			'after:size-[10px]',
			'after:border-b-2 after:border-r-2',
			'after:border-b-secondary-500/40 after:border-r-secondary-500/40',
			'after:rounded-br-[1px]',
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
