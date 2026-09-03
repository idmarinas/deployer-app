// theme/card.ts
// Estilo "Command Module": tarjeta inspirada en el panel de mandos de una nave
// espacial / cohete, con textura de panel técnico (dot-grid), soportes de
// esquina con glow, bisel interior de marco metálico, instrumento "porthole"
// de doble anillo en el header y un resplandor de "motor" en el footer.
export default {
	slots: {
		root: [
			'pcb-clip-card pcb-shadow-neutral pcb-panel-grid pcb-inset-bevel pcb-bracket-tl pcb-bracket-br',
			'border border-(--ui-border) bg-(--ui-bg-elevated)/90 backdrop-blur-md',
			'relative overflow-visible',
			'transition-all duration-300',
			'hover:border-primary-500/30 hover:pcb-shadow-hover-md',
		].join(' '),
		header: [
			'px-6 py-4 border-b border-(--ui-border) relative',
			'before:absolute before:bottom-0 before:left-6 before:right-6 before:h-px',
			'before:bg-linear-to-r before:from-primary-500/40 before:via-secondary-500/40 before:to-transparent',
			'after:absolute after:top-1/2 after:-translate-y-1/2 after:end-6',
			'after:size-6 after:rounded-full',
			'after:border-2 after:border-primary-500/25',
			'after:bg-linear-to-br after:from-primary-500/10 after:to-secondary-500/10',
			'after:shadow-[inset_0_0_8px_color-mix(in_srgb,var(--color-deployer-primary-500)_12%,transparent),0_0_4px_var(--pcb-trace-glow)]',
		].join(' '),
		body: 'px-6 py-5',
		footer: [
			'px-6 py-4 border-t border-(--ui-border) relative',
			'before:absolute before:top-0 before:left-6 before:right-6 before:h-px',
			'before:bg-linear-to-r before:from-primary-500/40 before:via-secondary-500/40 before:to-transparent',
			'after:absolute after:bottom-0 after:inset-x-0 after:h-[3px]',
			'after:bg-linear-to-r after:from-primary-500/30 after:via-secondary-500/30 after:to-transparent',
			'after:blur-[2px]',
		].join(' '),
	},
}
