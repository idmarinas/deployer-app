// theme/contextMenu.ts
// Mismo lenguaje visual que dropdownMenu.ts: panel readout con dot-grid,
// L-bracket en esquina y bisel interior. Item resaltado con traza izquierda.
export default {
	slots: {
		content: [
			'rounded-md border border-(--ui-border) bg-(--ui-bg-elevated)/95 backdrop-blur-xl overflow-hidden p-1',
			'shadow-2xl',
			'bg-[radial-gradient(circle_at_1px_1px,rgba(10,141,255,0.035)_1px,transparent_0)] bg-[size:20px_20px]',
			'shadow-[inset_0_0_0_1px_rgba(10,141,255,0.06),0_4px_24px_rgba(0,0,0,0.25)]',
			'relative before:absolute before:top-[6px] before:right-[6px]',
			'before:size-[10px]',
			'before:border-t-2 before:border-r-2',
			'before:border-t-primary-500/35 before:border-r-primary-500/35',
			'before:rounded-tr-[1px]',
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
		separator: 'h-px bg-(--ui-border) my-1 mx-1',
	},
}
