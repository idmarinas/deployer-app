// theme/tooltip.ts
// Estilo PCB: aspecto de "readout" técnico — fuente mono, glow sutil de borde
// superior simulando una traza que alimenta el panel de información.
export default {
	slots: {
		content: [
			'rounded-md px-2.5 py-1.5 text-xs font-pcb',
			'bg-(--ui-bg-elevated)/95 text-(--ui-text-toned) border border-(--ui-border)',
			'shadow-[0_0_16px_rgba(10,141,255,0.1),0_4px_16px_rgba(0,0,0,0.3)]',
			'backdrop-blur-md',
			'relative before:absolute before:inset-x-2 before:top-0 before:h-px',
			'before:bg-linear-to-r before:from-transparent before:via-primary-500/50 before:to-transparent',
		].join(' '),
		arrow: 'fill-(--ui-bg-elevated)',
	},
}
