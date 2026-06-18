// theme/contextMenu.ts
// Mismo lenguaje visual que dropdownMenu.ts: panel readout con borde-traza
// energizado en el item resaltado.
//
// IMPORTANTE: `data-disabled:opacity-40 data-disabled:pointer-events-none`
// evita que el highlight/hover se dispare sobre items marcados disabled
// (Reka UI usa el atributo `data-disabled`, no la pseudo-clase `:disabled`,
// para los items de menú).
export default {
	slots: {
		content: [
			'rounded-md border border-(--ui-border) bg-(--ui-bg-elevated)/95 backdrop-blur-xl shadow-2xl',
			'ring-1 ring-primary-500/10 overflow-hidden p-1',
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
