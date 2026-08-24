// theme/table.ts
// Estilo "Command Module": tabla como panel de datos de telemetría de nave
// espacial. Marco con L-brackets, cabecera con traza superior, filas que se
// iluminan como canales de datos activos con indicador lateral en hover,
// y nodos de columna en los extremos.
export default {
	slots: {
		root: [
			'relative w-full overflow-auto',
			'border border-(--ui-border) rounded-md',
			'shadow-[inset_0_0_0_1px_rgba(10,141,255,0.04)]',
			'bg-[radial-gradient(circle_at_1px_1px,rgba(10,141,255,0.015)_1px,transparent_0)] bg-[size:20px_20px]',
			// L-bracket top-left
			'before:absolute before:top-[6px] before:left-[6px]',
			'before:size-[10px]',
			'before:border-t-2 before:border-l-2',
			'before:border-t-primary-500/40 before:border-l-primary-500/40',
			'before:rounded-tl-[1px]',
			// L-bracket bottom-right
			'after:absolute after:bottom-[6px] after:right-[6px]',
			'after:size-[10px]',
			'after:border-b-2 after:border-r-2',
			'after:border-b-secondary-500/40 after:border-r-secondary-500/40',
			'after:rounded-br-[1px]',
		].join(' '),
		base: 'table-auto min-w-full border-separate border-spacing-0',
		caption: 'text-sm text-(--ui-text-dimmed) font-pcb mt-2',
		thead: [
			'sticky top-0 z-10',
			'bg-(--ui-bg-elevated)/95 backdrop-blur-sm',
			'bg-[radial-gradient(circle_at_1px_1px,rgba(10,141,255,0.03)_1px,transparent_0)] bg-[size:20px_20px]',
			'relative',
			'before:absolute before:inset-x-0 before:top-0 before:h-px',
			'before:bg-linear-to-r before:from-transparent before:via-primary-500/40 before:to-transparent',
		].join(' '),
		tbody: 'divide-y divide-(--ui-border)',
		tr: [
			'transition-all duration-150',
			'hover:bg-primary-500/5',
			'hover:shadow-[inset_2px_0_0_0_rgba(10,141,255,0.15)]',
			'data-[selected=true]:bg-primary-500/10',
		].join(' '),
		th: [
			'px-4 py-3 text-left text-xs font-pcb font-semibold uppercase tracking-wider',
			'text-(--ui-text-dimmed) border-b-2 border-(--ui-border-accented)',
			'relative',
			// Indicador nodo en primera columna
			'first:before:absolute first:before:left-1.5 first:before:top-1/2',
			'first:before:-translate-y-1/2 first:before:w-1.5 first:before:h-1.5',
			'first:before:rounded-full first:before:bg-primary-500/40',
			'first:before:shadow-[0_0_4px_rgba(10,141,255,0.3)]',
			// Línea de acento en última columna
			'last:after:absolute last:after:right-1.5 last:after:top-1/2',
			'last:after:-translate-y-1/2 last:after:w-px last:after:h-3',
			'last:after:bg-primary-500/20',
		].join(' '),
		td: 'px-4 py-3 text-sm text-(--ui-text-toned) border-b border-(--ui-border)',
		empty: 'text-center text-sm text-(--ui-text-dimmed) font-pcb py-8',
		loading: 'text-center text-sm text-(--ui-text-dimmed) font-pcb py-8',
	},
}
