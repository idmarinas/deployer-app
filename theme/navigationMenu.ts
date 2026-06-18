// theme/navigationMenu.ts
// Estilo PCB: el item activo muestra un indicador lateral tipo traza de
// circuito (pcb-trace-left); los iconos activos llevan glow de energía.
//
// IMPORTANTE: `data-disabled:opacity-40 data-disabled:pointer-events-none`
// evita que el hover se dispare sobre links marcados disabled (Reka UI usa
// el atributo `data-disabled` para los items de NavigationMenu).
export default {
	slots: {
		root: 'relative',
		list: 'flex flex-col gap-0.5',
		item: 'relative',
		link: [
			'relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium',
			'text-(--ui-text-dimmed) transition-all duration-200 cursor-pointer',
			'hover:bg-primary-500/8 hover:text-(--ui-text-toned)',
			'data-disabled:opacity-40 data-disabled:cursor-not-allowed data-disabled:pointer-events-none',
		].join(' '),
		linkActive: [
			'pcb-trace-left',
			'bg-linear-to-r from-primary-500/15 to-secondary-500/8',
			'text-primary-600 dark:text-primary-400 font-semibold',
		].join(' '),
		linkLeadingIcon: 'size-4 shrink-0 transition-colors duration-200',
		linkLeadingIconActive: 'text-primary-500 dark:text-primary-400 drop-shadow-[0_0_6px_rgba(10,141,255,0.5)]',
		childList: 'ms-6 mt-0.5 flex flex-col gap-0.5',
		childLink: [
			'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs',
			'text-(--ui-text-dimmed) transition-all duration-200 cursor-pointer',
			'hover:bg-primary-500/8 hover:text-(--ui-text-toned)',
			'data-disabled:opacity-40 data-disabled:cursor-not-allowed data-disabled:pointer-events-none',
		].join(' '),
		childLinkActive: 'text-primary-600 dark:text-primary-400 bg-primary-500/8',
	},
}
