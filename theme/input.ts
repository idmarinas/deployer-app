// theme/input.ts — Campo de entrada Command Module
const fieldBase = [
	'pcb-field-clip pcb-panel-grid pcb-inset-bevel',
	'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)',
	'border border-(--ui-border) placeholder:text-(--ui-text-dimmed)',
	'transition-all duration-200',
	'focus:outline-none focus:border-primary-500',
	'focus:[filter:drop-shadow(0_2px_6px_var(--pcb-trace-glow))]',
	'disabled:opacity-40 disabled:cursor-not-allowed',
].join(' ')

export default {
	slots: {
		root: 'relative',
		base: fieldBase,
		trailing: 'pointer-events-none',
	},
	variants: {
		size: {
			xs: { base: 'text-xs' },
			sm: { base: 'text-sm' },
			md: { base: 'text-sm font-pcb' },
			lg: { base: 'text-base font-pcb' },
			xl: { base: 'text-base font-pcb' },
		},
	},
	compoundVariants: [
		{
			color: 'primary',
			variant: 'outline',
			class: { base: 'ring-0 border-(--ui-border) focus:border-primary-500' },
		},
		{
			color: 'error',
			variant: 'outline',
			class: {
				base: 'border-error-500/70 focus:border-error-500 focus:[filter:drop-shadow(0_2px_6px_color-mix(in_srgb,var(--color-deployer-error-500)_35%,transparent))]',
			},
		},
	],
}
