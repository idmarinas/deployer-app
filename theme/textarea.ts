// theme/textarea.ts — Panel de entrada Command Module
export default {
	slots: {
		root: 'relative',
		base: [
			'pcb-field-clip pcb-panel-grid pcb-inset-bevel',
			'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)',
			'border border-(--ui-border) placeholder:text-(--ui-text-dimmed)',
			'transition-all duration-200 font-pcb',
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
				base: 'border-error-500/70 focus:border-error-500 focus:[filter:drop-shadow(0_2px_6px_color-mix(in_srgb,var(--color-deployer-error-500)_35%,transparent))]',
			},
		},
	],
}
