// theme/textarea.ts
// Estilo "Command Module": panel de entrada de datos con esquina recortada,
// bisel interior, dot-grid de instrumentos, y traza activa en focus.
export default {
	slots: {
		root: 'relative',
		base: [
			'[clip-path:polygon(0%_0%,100%_0%,100%_100%,8px_100%,0%_calc(100%-8px))]',
			'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)',
			'border border-(--ui-border) placeholder:text-(--ui-text-dimmed)',
			'transition-all duration-200 font-pcb',
			'shadow-[inset_0_0_0_1px_rgba(10,141,255,0.04)]',
			'bg-[radial-gradient(circle_at_1px_1px,rgba(10,141,255,0.02)_1px,transparent_0)] bg-[size:20px_20px]',
			'focus:outline-none focus:border-primary-500',
			'focus:[filter:drop-shadow(0_2px_6px_var(--pcb-trace-glow))]',
			'disabled:opacity-40 disabled:cursor-not-allowed',
			'[&::-webkit-resizer]:bg-transparent',
		].join(' '),
		trailing: 'pointer-events-none',
	},
	compoundVariants: [
		{
			color: 'error',
			variant: 'outline',
			class: {
				base: 'border-error-500/70 focus:border-error-500 focus:[filter:drop-shadow(0_2px_6px_rgba(255,10,85,0.35))]',
			},
		},
	],
}
