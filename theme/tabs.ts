// Selector de modo — Command Module.
// Panel de pestañas con dot-grid, el indicador activo es
// un "puente conductor" que se desliza con glow.
// Trigger activo con texto iluminado (blanco sobre gradiente del indicator).
export default {
	slots: {
		root: 'relative',
		list: [
			'relative flex items-center gap-1 p-1 rounded-md',
			'bg-(--ui-bg-elevated)/80 border border-(--ui-border) backdrop-blur-sm',
			'bg-[radial-gradient(circle_at_1px_1px,rgba(10,141,255,0.025)_1px,transparent_0)] bg-[size:20px_20px]',
			'shadow-[inset_0_0_0_1px_rgba(10,141,255,0.04)]',
		].join(' '),
		indicator: [
			'absolute transition-all duration-300 ease-in-out rounded-[4px]',
			'bg-linear-to-r from-primary-500 to-secondary-500',
			'shadow-[0_0_14px_rgba(10,141,255,0.4)]',
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
