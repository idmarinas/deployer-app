// theme/dashboardNavbar.ts
// Estilo PCB: barra de estado de sistema. Traza energizada en el borde
// inferior, título con tracking ancho tipo etiqueta de panel técnico.
export default {
	slots: {
		root: [
			'h-16 flex items-center justify-between gap-3 px-4 border-b border-(--ui-border) backdrop-blur-md relative',
			'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px',
			'after:bg-linear-to-r after:from-primary-500 after:to-secondary-500 after:opacity-50 dark:after:opacity-30',
		].join(' '),
		left: 'flex items-center gap-2',
		title: 'text-sm font-semibold text-(--ui-text-highlighted) font-pcb tracking-wider uppercase',
		icon: 'w-5 h-5 text-primary-500 dark:text-primary-400 drop-shadow-[0_0_6px_rgba(0,199,255,0.4)]',
		center: 'flex-1 flex items-center justify-center',
		right: 'flex items-center gap-2',
		toggle: 'lg:hidden',
	},
}
