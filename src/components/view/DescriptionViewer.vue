<script lang="ts">
import type { JSONContent } from '@tiptap/core'

import { generateHTML } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { computed } from 'vue'

const extensions = [StarterKit]
</script>

<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		value?: JSONContent | string | null
		placeholder?: string
	}>(),
	{
		placeholder: '',
	},
)

const html = computed(() => {
	if (!props.value) return ''
	const content = typeof props.value === 'string'
		? (() => { try { return JSON.parse(props.value) as JSONContent } catch { return null } })()
		: props.value
	if (!content) return ''
	try {
		return generateHTML(content, extensions)
	} catch {
		return ''
	}
})
</script>

<template>
	<div>
		<div v-if="html" v-html="html" class="ProseMirror min-h-6 text-sm" />
		<p v-else-if="placeholder" class="text-muted text-sm italic">
			{{ placeholder }}
		</p>
	</div>
</template>

<style scoped>
@import 'prosemirror-view/style/prosemirror.css';

.ProseMirror :deep(p) {
	margin-bottom: 0.5em;
}
.ProseMirror :deep(p:last-child) {
	margin-bottom: 0;
}
.ProseMirror :deep(h1) {
	font-size: 1.5em;
	font-weight: 700;
	margin-bottom: 0.5em;
}
.ProseMirror :deep(h2) {
	font-size: 1.25em;
	font-weight: 600;
	margin-bottom: 0.5em;
}
.ProseMirror :deep(h3) {
	font-size: 1.125em;
	font-weight: 600;
	margin-bottom: 0.5em;
}
.ProseMirror :deep(h4) {
	font-size: 1em;
	font-weight: 600;
	margin-bottom: 0.5em;
}
.ProseMirror :deep(ul),
.ProseMirror :deep(ol) {
	padding-left: 1.5em;
	margin-bottom: 0.5em;
}
.ProseMirror :deep(ol) {
	list-style: decimal;
}

.ProseMirror :deep(ul) {
	list-style-type: disc;
}
.ProseMirror :deep(li) {
	margin-bottom: 0.25em;
}
.ProseMirror :deep(blockquote) {
	border-left: 3px solid var(--ui-border);
	padding-left: 0.75em;
	margin-left: 0;
	margin-bottom: 0.5em;
	color: var(--ui-text-muted);
}
.ProseMirror :deep(pre) {
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.375em;
	padding: 0.75em;
	margin-bottom: 0.5em;
	overflow-x: auto;
	font-size: 0.875em;
}
.ProseMirror :deep(code) {
	font-size: 0.875em;
	background: var(--ui-bg-elevated);
	border-radius: 0.25em;
	padding: 0.15em 0.3em;
}
.ProseMirror :deep(pre code) {
	background: none;
	padding: 0;
}
.ProseMirror :deep(hr) {
	border: none;
	border-top: 1px solid var(--ui-border);
	margin: 1em 0;
}
.ProseMirror :deep(a) {
	color: var(--ui-primary);
	text-decoration: underline;
}
</style>
