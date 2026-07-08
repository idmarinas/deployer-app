// Junta de panel — Command Module.
// Línea de separación como traza de circuito con pads de soldadura
// en los extremos del label, simulando componentes SMD.
export default {
	slots: {
		root: 'flex items-center gap-3',
		border: [
			'flex-1 border-0 h-px',
			'bg-linear-to-r from-primary-500/20 via-primary-500/50 to-secondary-500/20',
		].join(' '),
		label: [
			'text-xs text-(--ui-text-dimmed) font-pcb tracking-wider uppercase shrink-0',
			'flex items-center gap-1.5',
			// Pad izquierdo
			'before:block before:size-[6px] before:rounded-full',
			'before:bg-primary-500/40 before:shadow-[0_0_4px_rgba(10,141,255,0.2)]',
			// Pad derecho
			'after:block after:size-[6px] after:rounded-full',
			'after:bg-secondary-500/40 after:shadow-[0_0_4px_rgba(130,26,255,0.2)]',
		].join(' '),
	},
}
