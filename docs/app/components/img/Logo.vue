<script setup lang="ts">
const bundle = useAppConfig().docsBundle

const props = defineProps({
	height: { type: Number, default: 512 },
	width: { type: Number, default: 512 },
})

const svgBundle = computed(() => {
	const units = props.width / 512
	const size = (units * 54) / bundle.short_name.length

	return {
		x: '50%',
		y: '50%',
		'dominant-baseline': 'middle',
		'text-anchor': 'middle',
		'font-size': `${size}cqw`,
	}
})
</script>

<template>
	<div class="relative" :style="`width: ${props.width}px; height: ${props.height}px;`">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 512 512"
			class="absolute top-0 left-0 rounded-lg bg-primary-200 fill-primary-950 dark:bg-primary-950 dark:fill-primary-200"
			v-bind="props"
		>
			<defs>
				<filter id="soften" x="0" y="0" width="100%" height="100%">
					<feBlend mode="multiply" in2="SourceGraphic" result="blend" />
					<feComponentTransfer>
						<feFuncR type="linear" slope="0.9" />
						<feFuncG type="linear" slope="0.9" />
						<feFuncB type="linear" slope="0.9" />
					</feComponentTransfer>
				</filter>

				<!-- Clip para modo cover -->
				<clipPath id="coverClip">
					<rect x="0" y="0" :width="props.width" :height="props.height" />
				</clipPath>
			</defs>
		</svg>
		<ImgRocket class="absolute w-full" />
		<div class="absolute" :style="`width: ${props.width}px; height: ${props.height}px;`">
			<svg class="w-full fill-primary-950 dark:fill-primary-200" :height="props.height / 2" viewBox="0 0 512 512">
				<text v-bind="svgBundle" font-weight="700">
					{{ bundle.short_name }}
				</text>
			</svg>
			<div
				class="absolute bottom-10 w-full text-primary-900 dark:text-primary-200 flex justify-end items-center gap-4 px-10 font-mono"
			>
				<UIcon name="i-tabler-copyright" mode="svg" class="size-10" />
				<span class="text-4xl">{{ bundle.author.username }}</span>
			</div>
		</div>
	</div>
</template>
