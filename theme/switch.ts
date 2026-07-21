// Interruptor de palanca — Command Module.
// OFF: track apagado como circuito en standby.
// ON: track energizado con gradiente + glow, thumb con
// punto indicador (nc) que brilla como sistema activo.
export default {
	slots: {
		root: 'relative inline-flex items-center gap-2',
		base: [
			'relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-default',
			'transition-all duration-200 ease-in-out',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30',
			'bg-(--ui-bg-accented) border-(--ui-border)',
			'shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]',
			'data-[state=checked]:bg-linear-to-r data-[state=checked]:from-primary-500 data-[state=checked]:to-secondary-500',
			'data-[state=checked]:border-transparent',
			'data-[state=checked]:shadow-[inset_0_1px_3px_rgba(0,0,0,0.1),0_0_12px_rgba(10,141,255,0.4)]',
			'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
		].join(' '),
		thumb: [
			'pointer-events-none size-3.5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]',
			'transition-all duration-200 relative',
			// Nodo indicador en el centro
			'before:absolute before:inset-0 before:size-full',
			'before:rounded-full before:bg-current',
			'before:opacity-0 before:transition-opacity before:duration-200',
			'data-[state=checked]:shadow-[0_0_8px_rgba(10,141,255,0.6),0_1px_3px_rgba(0,0,0,0.2)]',
			'data-[state=checked]:before:opacity-100',
			'data-[state=checked]:before:text-primary-50',
		].join(' '),
		label: 'text-sm text-(--ui-text-toned) cursor-pointer select-none has-disabled:cursor-not-allowed has-disabled:opacity-60',
		description: 'text-xs text-dimmed font-pcb',
	},
}
