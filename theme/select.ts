// theme/select.ts
// Mismo lenguaje visual que input/textarea. El dropdown se trata como un
// "panel de readout" con separadores tipo traza entre items.
//
// IMPORTANTE: "base" lleva un clip-path (esquina recortada) → el glow de
// focus usa `filter: drop-shadow(...)`. El slot "content" (dropdown) NO
// lleva clip-path, así que su `shadow-2xl` normal es correcto y se mantiene.
//
// IMPORTANTE: `disabled:pointer-events-none` evita que el `hover:` de borde
// se dispare cuando el select está deshabilitado.
export default {
	slots: {
		root: 'relative w-full',
		base: [
			'[clip-path:polygon(0%_0%,100%_0%,100%_100%,8px_100%,0%_calc(100%-8px))]',
			'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)',
			'border border-(--ui-border) placeholder:text-(--ui-text-dimmed)',
			'transition-all duration-200 font-pcb text-sm',
			'focus:outline-none focus:border-primary-500',
			'focus:[filter:drop-shadow(0_2px_6px_var(--pcb-trace-glow))]',
			'hover:border-(--ui-border-accented)',
			'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
			'w-full',
		].join(' '),
		// Dropdown del select — panel tipo readout (sin clip-path, shadow normal)
		content: [
			'rounded-md border border-(--ui-border) bg-(--ui-bg-elevated)/95 backdrop-blur-xl shadow-2xl',
			'ring-1 ring-primary-500/10 overflow-hidden',
		].join(' '),
		item: [
			'text-sm font-pcb text-(--ui-text-toned) px-3 py-2',
			'transition-all duration-150 cursor-pointer',
			'border-l-2 border-transparent',
			'hover:bg-primary-500/10 hover:text-primary-500 dark:hover:text-primary-400',
			'hover:border-l-primary-500',
			'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
		].join(' '),
		itemLabel: 'truncate',
		itemTrailingIcon: 'text-primary-500',
		trailingIcon: 'text-(--ui-text-dimmed) shrink-0',
	},
	compoundVariants: [
		{
			color: 'error',
			variant: 'outline',
			class: {
				base: 'border-error-500/70 focus:border-error-500 focus:[filter:drop-shadow(0_2px_6px_rgba(255,10,85,0.35))]',
			},
		},
	],
}
