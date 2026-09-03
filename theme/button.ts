// Botón de lanzamiento — Command Module.
// Sólido: panel energizado con arming indicator.
// Outline: standby con glow al hover.
// El clip-path (pcb-clip-br) solo se aplica en no-square.
// NUNCA usar box-shadow aquí (el clip-path lo recorta); usar pcb-shadow-*.
export default {
	slots: {
		base: [
			'font-pcb font-semibold tracking-wide',
			'relative overflow-hidden transition-all duration-200',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
			'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:[filter:none]',
			// Pad de circuito — indicador de "arming" en hover
			'hover:after:absolute hover:after:bottom-1 hover:after:left-1 hover:after:size-[3px]',
			'hover:after:rounded-full hover:after:bg-primary-400',
			'hover:after:shadow-[0_0_4px_var(--pcb-trace-glow)]',
		].join(' '),
	},
	variants: {
		square: {
			false: { base: 'pcb-clip-br' },
			true: { base: '' },
		},
	},
	compoundVariants: [
		{
			color: 'primary',
			variant: 'solid',
			class: `
				pcb-gradient-brand text-white border-0 pcb-shadow-sm pcb-gloss-line
				hover:brightness-110 hover:pcb-animate-pulse
				active:brightness-90 active:scale-[0.97]
				transition-all duration-200
				hover:shadow-[inset_0_0_0_1px_color-mix(in_srgb,white_15%,transparent)]
			`,
		},
		{
			color: 'primary',
			variant: 'outline',
			class: `
				bg-transparent border border-primary-500/60 text-primary-500
				dark:text-primary-400
				hover:bg-primary-500/8 hover:border-primary-500
				hover:[filter:drop-shadow(0_0_8px_var(--pcb-trace-glow))]
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'primary',
			variant: 'soft',
			class: `
				bg-primary-500/10 text-primary-600 dark:text-primary-400 border-0
				hover:bg-primary-500/20
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'primary',
			variant: 'ghost',
			class: `
				bg-transparent text-primary-600 dark:text-primary-400 border-0
				hover:bg-primary-500/10
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'primary',
			variant: 'subtle',
			class: `
				bg-primary-500/8 text-primary-600 dark:text-primary-400
				border border-primary-500/25
				hover:bg-primary-500/15 hover:border-primary-500/50
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'primary',
			variant: 'link',
			class: `
				bg-transparent text-primary-600 dark:text-primary-400 border-0
				underline-offset-4 hover:underline
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'secondary',
			variant: 'solid',
			class: `
				bg-secondary-500 text-white border-0 pcb-shadow-sm pcb-gloss-line
				hover:bg-secondary-400 hover:pcb-animate-pulse
				active:bg-secondary-600 active:scale-[0.97]
				transition-all duration-200
				hover:shadow-[inset_0_0_0_1px_color-mix(in_srgb,white_15%,transparent)]
			`,
		},
		{
			color: 'secondary',
			variant: 'outline',
			class: `
				bg-transparent border border-secondary-500/60 text-secondary-500
				dark:text-secondary-400
				hover:bg-secondary-500/8 hover:border-secondary-500
				hover:[filter:drop-shadow(0_0_8px_var(--pcb-trace-glow))]
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'secondary',
			variant: 'soft',
			class: `
				bg-secondary-500/10 text-secondary-600 dark:text-secondary-400 border-0
				hover:bg-secondary-500/20
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'secondary',
			variant: 'ghost',
			class: `
				bg-transparent text-secondary-600 dark:text-secondary-400 border-0
				hover:bg-secondary-500/10
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'secondary',
			variant: 'subtle',
			class: `
				bg-secondary-500/8 text-secondary-600 dark:text-secondary-400
				border border-secondary-500/25
				hover:bg-secondary-500/15 hover:border-secondary-500/50
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'neutral',
			variant: 'solid',
			class: `
				bg-neutral-700 dark:bg-neutral-700 text-white border-0 pcb-shadow-neutral pcb-gloss-line
				hover:bg-neutral-600
				active:bg-neutral-800 active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'neutral',
			variant: 'outline',
			class: `
				bg-transparent border border-neutral-400/60 dark:border-neutral-600/60
				text-neutral-700 dark:text-neutral-300
				hover:bg-neutral-500/8 hover:border-neutral-500
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'neutral',
			variant: 'soft',
			class: `
				bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border-0
				hover:bg-neutral-500/20
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'neutral',
			variant: 'ghost',
			class: `
				bg-transparent text-neutral-600 dark:text-neutral-400 border-0
				hover:bg-neutral-500/10
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'neutral',
			variant: 'subtle',
			class: `
				bg-neutral-500/8 text-neutral-600 dark:text-neutral-400
				border border-neutral-400/30 dark:border-neutral-600/30
				hover:bg-neutral-500/15 hover:border-neutral-500/50
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'success',
			variant: 'solid',
			class: `
				bg-success-500 text-white border-0 pcb-gloss-line
				[filter:drop-shadow(0_2px_8px_color-mix(in_srgb,var(--color-deployer-success-500)_30%,transparent))]
				hover:bg-success-400 hover:[filter:drop-shadow(0_0_16px_color-mix(in_srgb,var(--color-deployer-success-500)_50%,transparent))]
				active:bg-success-600 active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'success',
			variant: 'outline',
			class: `
				bg-transparent border border-success-500/60 text-success-600 dark:text-success-400
				hover:bg-success-500/8 hover:border-success-500
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'success',
			variant: 'soft',
			class: `
				bg-success-500/10 text-success-600 dark:text-success-400 border-0
				hover:bg-success-500/20
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'warning',
			variant: 'solid',
			class: `
				bg-warning-500 text-neutral-900 border-0 pcb-gloss-line
				[filter:drop-shadow(0_2px_8px_color-mix(in_srgb,var(--color-deployer-warning-500)_30%,transparent))]
				hover:bg-warning-400 hover:[filter:drop-shadow(0_0_16px_color-mix(in_srgb,var(--color-deployer-warning-500)_50%,transparent))]
				active:bg-warning-600 active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'warning',
			variant: 'outline',
			class: `
				bg-transparent border border-warning-500/60 text-warning-600 dark:text-warning-400
				hover:bg-warning-500/8 hover:border-warning-500
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'warning',
			variant: 'soft',
			class: `
				bg-warning-500/10 text-warning-600 dark:text-warning-400 border-0
				hover:bg-warning-500/20
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'error',
			variant: 'solid',
			class: `
				bg-error-500 text-white border-0 pcb-gloss-line
				[filter:drop-shadow(0_2px_8px_color-mix(in_srgb,var(--color-deployer-error-500)_30%,transparent))]
				hover:bg-error-400 hover:[filter:drop-shadow(0_0_16px_color-mix(in_srgb,var(--color-deployer-error-500)_50%,transparent))]
				active:bg-error-600 active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'error',
			variant: 'outline',
			class: `
				bg-transparent border border-error-500/60 text-error-600 dark:text-error-400
				hover:bg-error-500/8 hover:border-error-500
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
		{
			color: 'error',
			variant: 'soft',
			class: `
				bg-error-500/10 text-error-600 dark:text-error-400 border-0
				hover:bg-error-500/20
				active:scale-[0.97]
				transition-all duration-200
			`,
		},
	],
}
