// theme/radioGroup.ts
// Estilo "Command Module": selector de modo como panel de circuito.
// list/card: radio como pad (hundido → energizado con gradiente + glow).
// table: segmented control de panel PCB — celdas con dot-grid y bisel,
// la celda activa se "enciende" con gradiente de marca + glow + texto blanco.
export default {
	slots: {
		fieldset: 'flex gap-x-2',
		legend: 'mb-1 block font-medium font-pcb text-(--ui-text-highlighted)',
		item: 'group/rg flex items-start transition-all duration-200',
		base: [
			'shrink-0 rounded-full border transition-all duration-200 cursor-pointer',
			'bg-(--ui-bg-elevated) border-(--ui-border)',
			'shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]',
			'focus-visible:outline-none focus-visible:ring-2',
			'hover:border-(--ui-border-accented)',
			'data-[state=checked]:border-transparent',
			'data-[state=checked]:bg-linear-to-br data-[state=checked]:from-primary-500 data-[state=checked]:to-secondary-500',
			'data-[state=checked]:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_10px_rgba(10,141,255,0.45)]',
			'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
		].join(' '),
		indicator:
			'flex items-center justify-center size-full after:rounded-full after:bg-white after:shadow-[0_0_4px_rgba(255,255,255,0.6)]',
		// 'text-(--ui-text-toned)' reemplaza el 'text-default' fijo que trae el theme
		// por defecto de Nuxt UI para este slot: al ser ambas utilities de color,
		// twMerge elimina text-default y el label deja de pisar el color heredado.
		// El blanco en checked se aplica aquí mismo vía el group nombrado 'rg' del item
		// (group-has-data-[state=checked]), anclado solo a la variante 'table'.
		label: 'cursor-pointer select-none text-(--ui-text-toned) has-disabled:cursor-not-allowed has-disabled:opacity-60',
		description: 'text-xs text-(--ui-text-dimmed) mt-0.5 font-pcb',
	},
	variants: {
		color: {
			primary: { base: 'focus-visible:ring-primary-500/30', indicator: '' },
			secondary: { base: 'focus-visible:ring-secondary-500/30', indicator: '' },
			success: { base: 'focus-visible:ring-success-500/30', indicator: '' },
			info: { base: 'focus-visible:ring-info-500/30', indicator: '' },
			warning: { base: 'focus-visible:ring-warning-500/30', indicator: '' },
			error: { base: 'focus-visible:ring-error-500/30', indicator: '' },
			neutral: { base: 'focus-visible:ring-neutral-500/30', indicator: '' },
		},
		variant: {
			list: {
				item: 'text-(--ui-text-toned)',
			},
			card: {
				item: [
					'text-(--ui-text-toned) rounded-lg',
					'border border-(--ui-border) bg-(--ui-bg-elevated)',
					'shadow-[inset_0_0_0_1px_rgba(10,141,255,0.04)]',
				].join(' '),
			},
			table: {
				item: [
					'text-(--ui-text-dimmed) font-pcb',
					'bg-(--ui-bg-elevated) border border-(--ui-border)',
					'shadow-[inset_0_0_0_1px_rgba(10,141,255,0.04)]',
					'bg-[radial-gradient(circle_at_1px_1px,rgba(10,141,255,0.025)_1px,transparent_0)] bg-[size:20px_20px]',
				].join(' '),
			},
		},
	},
	compoundVariants: [
		{
			color: 'primary',
			variant: 'table',
			class: {
				item: [
					'has-data-[state=checked]:bg-auto',
					'has-data-[state=checked]:bg-linear-to-r',
					'has-data-[state=checked]:text-white',
					'has-data-[state=checked]:from-primary has-data-[state=checked]:to-secondary',
					'has-data-[state=checked]:font-semibold',
				].join(' '),
				label: 'group-has-data-[state=checked]/rg:text-white!',
				description: 'group-has-data-[state=checked]/rg:text-white!',
			},
		},
		{
			variant: 'table',
			class: {
				item: 'hover:bg-primary-500/8 hover:text-(--ui-text-highlighted) hover:border-(--ui-border-accented)',
			},
		},
		{
			variant: 'card',
			class: {
				item: 'hover:border-(--ui-border-accented)',
			},
		},
	],
}
