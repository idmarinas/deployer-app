// theme/table.ts — Tabla de telemetría Command Module
export default {
	slots: {
		root: [
			'relative w-full overflow-auto',
			'border border-(--ui-border) rounded-md',
			'pcb-panel-grid pcb-inset-bevel pcb-bracket-tl-sm pcb-bracket-br-sm',
		].join(' '),
		base: 'min-w-full border-separate border-spacing-0',
		caption: 'text-sm text-(--ui-text-dimmed) font-pcb mt-2',
		thead: [
			'sticky top-0 z-10',
			'bg-(--ui-bg-elevated)/95 backdrop-blur-sm pcb-panel-grid',
			'relative pcb-trace-brand-top',
		].join(' '),
		tbody: 'divide-y divide-(--ui-border)',
		tr: [
			'transition-all duration-150',
			'hover:bg-primary-500/5',
			'hover:shadow-[inset_2px_0_0_0_color-mix(in_srgb,var(--color-deployer-primary-500)_15%,transparent)]',
			'data-[selected=true]:bg-primary-500/10',
		].join(' '),
		th: [
			'px-4 py-3 text-left text-xs font-pcb font-semibold uppercase tracking-wider',
			'text-(--ui-text-dimmed) border-b-2 border-(--ui-border-accented)',
			'relative',
			'first:before:absolute first:before:left-1.5 first:before:top-1/2',
			'first:before:-translate-y-1/2 first:before:w-1.5 first:before:h-1.5',
			'first:before:rounded-full first:before:bg-primary-500/40',
			'first:before:shadow-[0_0_4px_var(--pcb-trace-glow)]',
			'last:after:absolute last:after:right-1.5 last:after:top-1/2',
			'last:after:-translate-y-1/2 last:after:w-px last:after:h-3',
			'last:after:bg-primary-500/20',
		].join(' '),
		td: 'px-4 py-3 text-sm text-(--ui-text-toned) border-b border-(--ui-border)',
		empty: 'text-center text-sm text-(--ui-text-dimmed) font-pcb py-8',
		loading: 'text-center text-sm text-(--ui-text-dimmed) font-pcb py-8',
	},
}
