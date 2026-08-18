<!-- Layout básico centrado (vertical/horizontal) -->

<template>
	<UMain>
		<div class="h-screen flex items-center justify-center px-4">
			<UColorModeSelect class="absolute top-8 left-8 z-10" />
			<LocaleChange class="absolute top-8 right-8 z-10" />

			<RouterView />
		</div>
	</UMain>
</template>
