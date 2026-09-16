<script lang="ts" setup>
const { title, description, headline } = defineProps<{
	title?: string
	description?: string
	headline?: string
	socials?: {
		icons: []
		username: string
	}
}>()

const bundle = useAppConfig().docsBundle
</script>

<template>
	<div class="relative w-full h-full flex flex-row justify-center gap-4 pl-25 bg-blue-950">
		<svg
			class="absolute right-0 top-0 fill-blue-200"
			height="593"
			viewBox="0 0 629 593"
			width="629"
			xmlns="http://www.w3.org/2000/svg"
		>
			<g filter="url(#filter0_f_199_94966)">
				<path
					class="fill-blue-200"
					d="M628.5 -578L639.334 -94.4223L806.598 -548.281L659.827 -87.387L965.396 -462.344L676.925 -74.0787L1087.69 -329.501L688.776 -55.9396L1160.22 -164.149L694.095 -34.9354L1175.13 15.7948L692.306 -13.3422L1130.8 190.83L683.602 6.50012L1032.04 341.989L668.927 22.4412L889.557 452.891L649.872 32.7537L718.78 511.519L628.5 36.32L538.22 511.519L607.128 32.7537L367.443 452.891L588.073 22.4412L224.955 341.989L573.398 6.50012L126.198 190.83L564.694 -13.3422L81.8734 15.7948L562.905 -34.9354L96.7839 -164.149L568.224 -55.9396L169.314 -329.501L580.075 -74.0787L291.604 -462.344L597.173 -87.387L450.402 -548.281L617.666 -94.4223L628.5 -578Z"
				/>
			</g>
			<defs>
				<filter
					id="filter0_f_199_94966"
					color-interpolation-filters="sRGB"
					filterUnits="userSpaceOnUse"
					height="1251.52"
					width="1255.25"
					x="0.873535"
					y="-659"
				>
					<feFlood flood-opacity="0" result="BackgroundImageFix" />
					<feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
					<feGaussianBlur result="effect1_foregroundBlur_199_94966" stdDeviation="40.5" />
				</filter>
			</defs>
		</svg>

		<div class="flex-1 flex flex-col justify-center">
			<p v-if="headline" class="flex items-center uppercase gap-4 text-[32px] text-blue-300 mb-4 font-semibold">
				<UIcon mode="svg" name="i-tabler-tag" />
				<span>{{ headline }}</span>
			</p>
			<h1 v-if="title" class="nlovk w-150 m-0 text-[75px] font-semibold mb-4 text-white text-ellipsis line-clamp-2">
				{{ title.slice(0, 60) }}
			</h1>
			<p v-if="description" class="block text-[32px] text-[#E4E4E7] leading-tight text-ellipsis line-clamp-3">
				{{ description.slice(0, 200) }}
			</p>
		</div>

		<div class="flex-none flex flex-col items-center justify-center text-blue-300 dark:text-blue-900">
			<div class="text-4xl -mb-7">{{ bundle.author.username }}</div>
			<SvgRocket class="opacity-65" height="340" width="340" />
			<span class="text-5xl -mt-24">{{ bundle.short_name }}</span>
		</div>
	</div>
</template>
