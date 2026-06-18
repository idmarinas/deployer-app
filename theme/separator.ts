// theme/separator.ts
// Estilo PCB: línea de traza con pads de soldadura (puntos) en los extremos
// cuando hay label, simulando un componente conectado en la pista.
export default {
	slots: {
		root: 'flex items-center gap-3',
		border: [
			'flex-1 border-0 h-px',
			'bg-linear-to-r from-primary-500/10 via-primary-500/40 to-primary-500/10',
		].join(' '),
		label: 'text-xs text-(--ui-text-dimmed) font-pcb tracking-wider uppercase shrink-0 flex items-center gap-1.5',
	},
}
