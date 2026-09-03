// theme/dashboardNavbar.ts — Barra de estado Command Module
export default {
	slots: {
		root: [
			'h-16 flex items-center justify-between gap-3 px-4 backdrop-blur-md relative',
			'border-b border-(--ui-border) pcb-panel-grid pcb-trace-brand-bottom',
		].join(' '),
		left: 'flex items-center gap-2',
		title: 'text-sm font-semibold text-(--ui-text-highlighted) font-pcb tracking-wider uppercase',
		icon: 'w-5 h-5 text-primary-500 dark:text-primary-400 drop-shadow-[0_0_6px_var(--pcb-trace-glow)]',
		center: 'flex-1 flex items-center justify-center',
		right: 'flex items-center gap-2',
		toggle: 'lg:hidden',
	},
}
