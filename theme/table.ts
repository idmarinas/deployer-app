// theme/table.ts
// Estilo PCB: cabecera tipo "header de placa", filas como pistas horizontales
// que se iluminan en hover, separadores sutiles entre filas.
export default {
	slots: {
		root: 'relative w-full overflow-auto',
		base: 'min-w-full border-separate border-spacing-0',
		caption: 'text-sm text-(--ui-text-dimmed) font-pcb mt-2',
		thead: 'sticky top-0 z-10 bg-(--ui-bg-elevated)/95 backdrop-blur-sm',
		tbody: 'divide-y divide-(--ui-border)',
		tr: [
			'transition-colors duration-150',
			'hover:bg-primary-500/5',
			'data-[selected=true]:bg-primary-500/10',
		].join(' '),
		th: [
			'px-4 py-3 text-left text-xs font-pcb font-semibold uppercase tracking-wider',
			'text-(--ui-text-dimmed) border-b-2 border-(--ui-border-accented)',
			'relative',
			// Pequeño nodo PCB al inicio de cada columna
			'first:before:absolute first:before:left-1.5 first:before:top-1/2',
			'first:before:-translate-y-1/2 first:before:w-1.5 first:before:h-1.5',
			'first:before:rounded-full first:before:bg-primary-500/40',
		].join(' '),
		td: 'px-4 py-3 text-sm text-(--ui-text-toned) border-b border-(--ui-border)',
		empty: 'text-center text-sm text-(--ui-text-dimmed) font-pcb py-8',
		loading: 'text-center text-sm text-(--ui-text-dimmed) font-pcb py-8',
	},
}
