// theme/dropdownMenu.ts — Panel readout Command Module
export default {
	slots: {
		content: [
			'rounded-md border border-(--ui-border) bg-(--ui-bg-elevated)/95 backdrop-blur-xl overflow-hidden p-1',
			'pcb-panel-grid pcb-inset-bevel pcb-bracket-tl-sm relative',
			'shadow-[inset_0_0_0_1px_var(--pcb-inset-border),0_4px_24px_color-mix(in_srgb,black_25%,transparent)]',
		].join(' '),
		group: 'p-0',
		label: 'text-xs font-pcb uppercase tracking-wider text-(--ui-text-dimmed) px-2 py-1.5',
		item: [
			'text-sm text-(--ui-text-toned) px-2 py-1.5 rounded-[3px]',
			'transition-all duration-150 cursor-pointer',
			'border-l-2 border-transparent',
			'data-highlighted:bg-primary-500/10 data-highlighted:text-primary-600 dark:data-highlighted:text-primary-400',
			'data-highlighted:border-l-primary-500',
			'data-disabled:opacity-40 data-disabled:cursor-not-allowed data-disabled:pointer-events-none',
		].join(' '),
		itemLeadingIcon: 'shrink-0 text-(--ui-text-dimmed) group-data-highlighted:text-primary-500',
		itemTrailingIcon: 'shrink-0 text-(--ui-text-dimmed)',
		itemLabel: 'truncate',
		itemLabelExternalIcon: 'size-3 text-(--ui-text-dimmed)',
		separator: 'h-px bg-(--ui-border) my-1 mx-1',
		arrow: 'fill-(--ui-bg-elevated)',
	},
}
