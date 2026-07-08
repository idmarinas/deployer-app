// theme/select.ts
// Estilo "Command Module": selector de modo/pipeline con esquina recortada,
// bisel interior, dot-grid de panel, y dropdown como "panel de readout".
export default {
	slots: {
		root: 'relative w-full',
		base: [
			'[clip-path:polygon(0%_0%,100%_0%,100%_100%,8px_100%,0%_calc(100%-8px))]',
			'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)',
			'border border-(--ui-border) placeholder:text-(--ui-text-dimmed)',
			'transition-all duration-200 font-pcb text-sm',
			'shadow-[inset_0_0_0_1px_rgba(10,141,255,0.04)]',
			'bg-[radial-gradient(circle_at_1px_1px,rgba(10,141,255,0.02)_1px,transparent_0)] bg-[size:20px_20px]',
			'focus:outline-none focus:border-primary-500',
			'focus:[filter:drop-shadow(0_2px_6px_var(--pcb-trace-glow))]',
			'hover:border-(--ui-border-accented)',
			'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
			'w-full',
		].join(' '),
		content: [
			'rounded-md border border-(--ui-border) bg-(--ui-bg-elevated)/95 backdrop-blur-xl',
			'shadow-[inset_0_0_0_1px_rgba(10,141,255,0.06),0_4px_24px_rgba(0,0,0,0.25)]',
			'bg-[radial-gradient(circle_at_1px_1px,rgba(10,141,255,0.03)_1px,transparent_0)] bg-[size:20px_20px]',
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
				base: 'border-error-500/70 focus:border-error-500 focus:[filter:drop-shadow(0_2px_6px_rgba(255,10,85,0.35))]',
			},
		},
	],
}
