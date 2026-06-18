// theme/button.ts
// Estilo PCB: esquina inferior-derecha recortada, pulso de energía en solid hover,
// traza activa en outline. Compatible con modo claro/oscuro via colores semánticos.
//
// IMPORTANTE: el clip-path `pcb-clip-br` (esquina recortada) SOLO se aplica
// cuando el botón NO es `square` (ver `variants.square` más abajo). Un botón
// `square` (icon-only) usa `rounded-full`/forma circular propia de Nuxt UI, y
// `clip-path` + `border-radius` circular son geométricamente incompatibles:
// el clip-path recorta un polígono recto justo en la zona donde el radio
// intenta curvar, dejando ver "esquinas" rectas dentro del propio círculo.
// La solución correcta no es forzar ambos a la vez, sino no aplicar el
// clip-path en absoluto sobre botones square.
//
// IMPORTANTE: este "base" lleva `pcb-clip-br` (clip-path) en botones no-square.
// Por eso NUNCA se usa `shadow-[...]` aquí — box-shadow se proyecta sobre la
// caja rectangular original y "se asoma" en la esquina recortada. Se usan las
// utilidades `.pcb-shadow-*` (filter: drop-shadow) de main.css, que sí
// respetan la silueta recortada/circular en ambos casos (square o no).
//
// NOTA: en una misma clase nunca se combinan dos utilidades que animen/fijen
// `filter` sobre el mismo selector (p. ej. `hover:pcb-shadow-*` junto con
// `hover:pcb-animate-pulse`) — `filter` no se acumula como `box-shadow`, así
// que solo una de las dos reglas "gana" de forma no determinista. Si hay
// animación de pulso en hover, esa es la única regla de filter en hover.
//
// IMPORTANTE: `disabled:pointer-events-none` en "base" es lo que evita que
// CUALQUIER efecto hover/active (de cualquier variante, presente o futura) se
// dispare cuando el botón está disabled — el navegador deja de emitir el
// estado :hover/:active sobre el elemento, así que no hace falta repetir
// `disabled:hover:...` en cada una de las variantes de compoundVariants.
export default {
	slots: {
		base: [
			'font-pcb font-semibold tracking-wide',
			'relative overflow-hidden transition-all duration-200',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
			'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:[filter:none]',
		].join(' '),
	},
	variants: {
		// `square: false` (botones con label) → esquina recortada PCB.
		// `square: true` (icon-only, normalmente circular) → sin clip-path,
		// para no chocar con el border-radius circular que aplica Nuxt UI.
		square: {
			false: { base: 'pcb-clip-br' },
			true: { base: '' },
		},
	},
	compoundVariants: [
		// ─── PRIMARY ──────────────────────────────────────────────────────────
		{
			color: 'primary',
			variant: 'solid',
			class: `
				bg-gradient-to-r from-primary-500 to-secondary-500
				text-white border-0
				pcb-shadow-sm
				hover:from-primary-400 hover:to-secondary-400
				hover:pcb-animate-pulse
				active:from-primary-600 active:to-secondary-600 active:scale-[0.98]
				transition-all duration-200
				before:absolute before:inset-x-0 before:top-0 before:h-px
				before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent
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
				active:scale-[0.98]
				transition-all duration-200
			`,
		},
		{
			color: 'primary',
			variant: 'soft',
			class: `
				bg-primary-500/10 text-primary-600 dark:text-primary-400 border-0
				hover:bg-primary-500/20
				active:scale-[0.98]
				transition-all duration-200
			`,
		},
		{
			color: 'primary',
			variant: 'ghost',
			class: `
				bg-transparent text-primary-600 dark:text-primary-400 border-0
				hover:bg-primary-500/10
				active:scale-[0.98]
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
				active:scale-[0.98]
				transition-all duration-200
			`,
		},
		{
			color: 'primary',
			variant: 'link',
			class: `
				bg-transparent text-primary-600 dark:text-primary-400 border-0
				underline-offset-4 hover:underline
				active:scale-[0.98]
				transition-all duration-200
			`,
		},
		// ─── SECONDARY ────────────────────────────────────────────────────────
		{
			color: 'secondary',
			variant: 'solid',
			class: `
				bg-secondary-500 text-white border-0
				pcb-shadow-sm
				hover:bg-secondary-400
				hover:pcb-animate-pulse
				active:bg-secondary-600 active:scale-[0.98]
				transition-all duration-200
				before:absolute before:inset-x-0 before:top-0 before:h-px
				before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent
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
				active:scale-[0.98]
				transition-all duration-200
			`,
		},
		{
			color: 'secondary',
			variant: 'soft',
			class: `
				bg-secondary-500/10 text-secondary-600 dark:text-secondary-400 border-0
				hover:bg-secondary-500/20
				active:scale-[0.98]
				transition-all duration-200
			`,
		},
		{
			color: 'secondary',
			variant: 'ghost',
			class: `
				bg-transparent text-secondary-600 dark:text-secondary-400 border-0
				hover:bg-secondary-500/10
				active:scale-[0.98]
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
				active:scale-[0.98]
				transition-all duration-200
			`,
		},
		// ─── NEUTRAL ──────────────────────────────────────────────────────────
		{
			color: 'neutral',
			variant: 'solid',
			class: `
				bg-neutral-700 dark:bg-neutral-700 text-white border-0
				pcb-shadow-neutral
				hover:bg-neutral-600
				active:bg-neutral-800 active:scale-[0.98]
				transition-all duration-200
				before:absolute before:inset-x-0 before:top-0 before:h-px
				before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent
			`,
		},
		{
			color: 'neutral',
			variant: 'outline',
			class: `
				bg-transparent border border-neutral-400/60 dark:border-neutral-600/60
				text-neutral-700 dark:text-neutral-300
				hover:bg-neutral-500/8 hover:border-neutral-500
				active:scale-[0.98]
				transition-all duration-200
			`,
		},
		{
			color: 'neutral',
			variant: 'soft',
			class: `
				bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border-0
				hover:bg-neutral-500/20
				active:scale-[0.98]
				transition-all duration-200
			`,
		},
		{
			color: 'neutral',
			variant: 'ghost',
			class: `
				bg-transparent text-neutral-600 dark:text-neutral-400 border-0
				hover:bg-neutral-500/10
				active:scale-[0.98]
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
				active:scale-[0.98]
				transition-all duration-200
			`,
		},
		// ─── SUCCESS ──────────────────────────────────────────────────────────
		{
			color: 'success',
			variant: 'solid',
			class: `
				bg-success-500 text-white border-0
				[filter:drop-shadow(0_2px_8px_rgba(0,200,163,0.3))]
				hover:bg-success-400 hover:[filter:drop-shadow(0_0_16px_rgba(0,200,163,0.5))]
				active:bg-success-600 active:scale-[0.98]
				transition-all duration-200
				before:absolute before:inset-x-0 before:top-0 before:h-px
				before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent
			`,
		},
		{
			color: 'success',
			variant: 'outline',
			class: `
				bg-transparent border border-success-500/60 text-success-600 dark:text-success-400
				hover:bg-success-500/8 hover:border-success-500
				active:scale-[0.98]
				transition-all duration-200
			`,
		},
		{
			color: 'success',
			variant: 'soft',
			class: `
				bg-success-500/10 text-success-600 dark:text-success-400 border-0
				hover:bg-success-500/20
				active:scale-[0.98]
				transition-all duration-200
			`,
		},
		// ─── WARNING ──────────────────────────────────────────────────────────
		{
			color: 'warning',
			variant: 'solid',
			class: `
				bg-warning-500 text-neutral-900 border-0
				[filter:drop-shadow(0_2px_8px_rgba(230,178,0,0.3))]
				hover:bg-warning-400 hover:[filter:drop-shadow(0_0_16px_rgba(230,178,0,0.5))]
				active:bg-warning-600 active:scale-[0.98]
				transition-all duration-200
				before:absolute before:inset-x-0 before:top-0 before:h-px
				before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent
			`,
		},
		{
			color: 'warning',
			variant: 'outline',
			class: `
				bg-transparent border border-warning-500/60 text-warning-600 dark:text-warning-400
				hover:bg-warning-500/8 hover:border-warning-500
				active:scale-[0.98]
				transition-all duration-200
			`,
		},
		{
			color: 'warning',
			variant: 'soft',
			class: `
				bg-warning-500/10 text-warning-600 dark:text-warning-400 border-0
				hover:bg-warning-500/20
				active:scale-[0.98]
				transition-all duration-200
			`,
		},
		// ─── ERROR ────────────────────────────────────────────────────────────
		{
			color: 'error',
			variant: 'solid',
			class: `
				bg-error-500 text-white border-0
				[filter:drop-shadow(0_2px_8px_rgba(255,10,85,0.3))]
				hover:bg-error-400 hover:[filter:drop-shadow(0_0_16px_rgba(255,10,85,0.5))]
				active:bg-error-600 active:scale-[0.98]
				transition-all duration-200
				before:absolute before:inset-x-0 before:top-0 before:h-px
				before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent
			`,
		},
		{
			color: 'error',
			variant: 'outline',
			class: `
				bg-transparent border border-error-500/60 text-error-600 dark:text-error-400
				hover:bg-error-500/8 hover:border-error-500
				active:scale-[0.98]
				transition-all duration-200
			`,
		},
		{
			color: 'error',
			variant: 'soft',
			class: `
				bg-error-500/10 text-error-600 dark:text-error-400 border-0
				hover:bg-error-500/20
				active:scale-[0.98]
				transition-all duration-200
			`,
		},
	],
}
