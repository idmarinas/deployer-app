// theme/select.ts — Selector Command Module
export default {
	slots: {
		root: 'relative w-full',
		base: [
			'pcb-field-clip pcb-panel-grid pcb-inset-bevel',
			'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)',
			'border border-(--ui-border) placeholder:text-(--ui-text-dimmed)',
			'transition-all duration-200 font-pcb text-sm',
			'focus:outline-none focus:border-primary-500',
			'focus:[filter:drop-shadow(0_2px_6px_var(--pcb-trace-glow))]',
			'hover:border-(--ui-border-accented)',
			'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
			'w-full',
		].join(' '),
		content: [
			'rounded-md border border-(--ui-border) bg-(--ui-bg-elevated)/95 backdrop-blur-xl',
			'pcb-panel-grid pcb-inset-bevel',
			'shadow-[inset_0_0_0_1px_var(--pcb-inset-border),0_4px_24px_color-mix(in_srgb,black_25%,transparent)]',
			'overflow-hidden',
		].join(' '),
		item: [
			'text-sm font-pcb text-(--ui-text-toned) px-3 py-2',
			'transition-all duration-150 cursor-pointer',
			'border-l-2 border-transparent',
			'hover:bg-primary-500/10 hover:text-primary-500 dark:hover:text-primary-400',
			'hover:border-l-primary-500',
			'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
		].join(' '),
		itemLabel: 'truncate',
		itemTrailingIcon: 'text-primary-500',
		trailingIcon: 'text-(--ui-text-dimmed) shrink-0',
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
