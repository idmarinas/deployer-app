// Selector de modo — Command Module.
export default {
	slots: {
		root: 'relative',
		list: [
			'relative flex items-center gap-1 p-1 rounded-md',
			'bg-(--ui-bg-elevated)/80 border border-(--ui-border) backdrop-blur-sm',
			'pcb-panel-grid pcb-inset-bevel',
		].join(' '),
		indicator: [
			'absolute transition-all duration-300 ease-in-out rounded-[4px]',
			'pcb-gradient-brand',
			'shadow-[0_0_16px_var(--pcb-trace-glow)]',
		].join(' '),
		trigger: [
			'relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium font-pcb rounded-[4px]',
			'text-(--ui-text-dimmed) transition-all duration-200 cursor-pointer select-none',
			'hover:text-(--ui-text-toned)',
			'data-[state=active]:text-white',
			'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30',
			'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
		].join(' '),
		content: 'mt-4 focus:outline-none',
	},
}
