// theme/radioGroup.ts — Selector de modo Command Module
export default {
	slots: {
		fieldset: 'flex gap-x-2',
		legend: 'mb-1 block font-medium font-pcb text-(--ui-text-highlighted)',
		item: 'group/rg flex items-start transition-all duration-200',
		base: [
			'shrink-0 rounded-full border transition-all duration-200 cursor-pointer',
			'bg-(--ui-bg-elevated) border-(--ui-border)',
			'shadow-[inset_0_1px_3px_color-mix(in_srgb,black_12%,transparent)]',
			'focus-visible:outline-none focus-visible:ring-2',
			'hover:border-(--ui-border-accented)',
			'data-[state=checked]:border-transparent',
			'data-[state=checked]:pcb-gradient-brand',
			'data-[state=checked]:shadow-[inset_0_1px_0_color-mix(in_srgb,white_20%,transparent),0_0_10px_var(--pcb-trace-glow)]',
			'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
		].join(' '),
		indicator:
			'flex items-center justify-center size-full after:rounded-full after:bg-white after:shadow-[0_0_4px_color-mix(in_srgb,white_60%,transparent)]',
		label: 'cursor-pointer select-none text-(--ui-text-toned) has-disabled:cursor-not-allowed has-disabled:opacity-60',
		description: 'text-xs text-(--ui-text-dimmed) mt-0.5 font-pcb',
	},
	variants: {
		color: {
			primary: { base: 'focus-visible:ring-primary-500/30', indicator: '' },
			secondary: { base: 'focus-visible:ring-secondary-500/30', indicator: '' },
			success: { base: 'focus-visible:ring-success-500/30', indicator: '' },
			info: { base: 'focus-visible:ring-info-500/30', indicator: '' },
			warning: { base: 'focus-visible:ring-warning-500/30', indicator: '' },
			error: { base: 'focus-visible:ring-error-500/30', indicator: '' },
			neutral: { base: 'focus-visible:ring-neutral-500/30', indicator: '' },
		},
		variant: {
			list: {
				item: 'text-(--ui-text-toned)',
			},
			card: {
				item: [
					'text-(--ui-text-toned) rounded-lg',
					'border border-(--ui-border) bg-(--ui-bg-elevated) pcb-inset-bevel',
				].join(' '),
			},
			table: {
				item: [
					'text-(--ui-text-dimmed) font-pcb',
					'bg-(--ui-bg-elevated) border border-(--ui-border)',
					'pcb-panel-grid pcb-inset-bevel',
				].join(' '),
			},
		},
	},
	compoundVariants: [
		{
			color: 'primary',
			variant: 'table',
			class: {
				item: [
					'has-data-[state=checked]:bg-auto',
					'has-data-[state=checked]:pcb-gradient-brand',
					'has-data-[state=checked]:text-white',
					'has-data-[state=checked]:font-semibold',
					'has-data-[state=checked]:shadow-[0_0_12px_var(--pcb-trace-glow)]',
				].join(' '),
				label: 'group-has-data-[state=checked]/rg:text-white!',
				description: 'group-has-data-[state=checked]/rg:text-white!',
			},
		},
		{
			variant: 'table',
			class: {
				item: 'hover:bg-primary-500/8 hover:text-(--ui-text-highlighted) hover:border-(--ui-border-accented)',
			},
		},
		{
			variant: 'card',
			class: {
				item: 'hover:border-(--ui-border-accented)',
			},
		},
		{
			size: 'xs',
			variant: ['card', 'table'],
			class: { item: 'px-2.5 py-2' },
		},
		{
			size: 'sm',
			variant: ['card', 'table'],
			class: { item: 'px-3 py-2.5' },
		},
		{
			size: 'md',
			variant: ['card', 'table'],
			class: { item: 'px-3.5 py-3' },
		},
		{
			size: 'lg',
			variant: ['card', 'table'],
			class: { item: 'px-4 py-3.5' },
		},
		{
			size: 'xl',
			variant: ['card', 'table'],
			class: { item: 'px-4.5 py-4' },
		},
	],
}
