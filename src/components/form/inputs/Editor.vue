<script setup lang="ts">
import type { DropdownMenuItem, EditorSuggestionMenuItem, EditorToolbarItem } from '@nuxt/ui'
import type { StarterKitOptions } from '@tiptap/starter-kit'
import type { Editor, JSONContent } from '@tiptap/vue-3'

import { mapEditorItems } from '@nuxt/ui/utils/editor'
import { CharacterCount } from '@tiptap/extensions'
import { upperFirst } from 'scule'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { SchemaSanitizer } from '@/utils/Tiptap/SchemaSanitizerExtension'

const { t } = useI18n()

const props = withDefaults(
	defineProps<{
		jsonSize?: number
		jsonLimit?: number
	}>(),
	{
		jsonSize: undefined,
		jsonLimit: undefined,
	},
)

const state = defineModel<JSONContent | undefined>()

const selectedNode = ref<{ node: JSONContent; pos: number }>()

const suggestionItems: EditorSuggestionMenuItem[][] = [
	// [
	// 	{
	// 		type: 'label',
	// 		label: t('components.editor.suggestion.text'),
	// 	},
	// 	{
	// 		kind: 'paragraph',
	// 		label: t('components.editor.suggestion.paragraph'),
	// 		icon: 'i-tabler-pilcrow',
	// 	},
	// 	{
	// 		kind: 'heading',
	// 		level: 1,
	// 		label: t('components.editor.suggestion.heading1'),
	// 		icon: 'i-tabler-h-1',
	// 	},
	// 	{
	// 		kind: 'heading',
	// 		level: 2,
	// 		label: t('components.editor.suggestion.heading2'),
	// 		icon: 'i-tabler-h-2',
	// 	},
	// 	{
	// 		kind: 'heading',
	// 		level: 3,
	// 		label: t('components.editor.suggestion.heading3'),
	// 		icon: 'i-tabler-h-3',
	// 	},
	// ],
	[
		{
			type: 'label',
			label: t('components.editor.suggestion.lists'),
		},
		{
			kind: 'bulletList',
			label: t('components.editor.suggestion.bulletList'),
			icon: 'i-tabler-list',
		},
		{
			kind: 'orderedList',
			label: t('components.editor.suggestion.numberedList'),
			icon: 'i-tabler-list-numbers',
		},
	],
	[
		{
			type: 'label',
			label: t('components.editor.suggestion.insert'),
		},
		// {
		// 	kind: 'blockquote',
		// 	label: t('components.editor.suggestion.blockquote'),
		// 	icon: 'i-tabler-quote',
		// },
		// {
		// 	kind: 'codeBlock',
		// 	label: t('components.editor.suggestion.codeBlock'),
		// 	icon: 'i-tabler-code',
		// },
		// {
		// 	kind: 'horizontalRule',
		// 	label: t('components.editor.suggestion.divider'),
		// 	icon: 'i-tabler-separator-horizontal',
		// },
	],
]

const toolbarItems: EditorToolbarItem[][] = [
	// [
	// 	{
	// 		icon: 'i-tabler-heading',
	// 		tooltip: { text: t('components.editor.toolbar.headings') },
	// 		content: {
	// 			align: 'start',
	// 		},
	// 		items: [
	// 			{
	// 				kind: 'heading',
	// 				level: 1,
	// 				icon: 'i-tabler-h-1',
	// 				label: t('components.editor.suggestion.heading1'),
	// 			},
	// 			{
	// 				kind: 'heading',
	// 				level: 2,
	// 				icon: 'i-tabler-h-2',
	// 				label: t('components.editor.suggestion.heading2'),
	// 			},
	// 			{
	// 				kind: 'heading',
	// 				level: 3,
	// 				icon: 'i-tabler-h-3',
	// 				label: t('components.editor.suggestion.heading3'),
	// 			},
	// 			{
	// 				kind: 'heading',
	// 				level: 4,
	// 				icon: 'i-tabler-h-4',
	// 				label: t('components.editor.suggestion.heading4'),
	// 			},
	// 		],
	// 	},
	// ],
	[
		{
			kind: 'mark',
			mark: 'bold',
			icon: 'i-tabler-bold',
			tooltip: { text: t('components.editor.toolbar.bold') },
		},
		{
			kind: 'mark',
			mark: 'italic',
			icon: 'i-tabler-italic',
			tooltip: { text: t('components.editor.toolbar.italic') },
		},
		{
			kind: 'mark',
			mark: 'underline',
			icon: 'i-tabler-underline',
			tooltip: { text: t('components.editor.toolbar.underline') },
		},
		{
			kind: 'mark',
			mark: 'strike',
			icon: 'i-tabler-strikethrough',
			tooltip: { text: t('components.editor.toolbar.strikethrough') },
		},
		// {
		// 	kind: 'mark',
		// 	mark: 'code',
		// 	icon: 'i-tabler-code',
		// 	tooltip: { text: t('components.editor.toolbar.code') },
		// },
	],
]

const dropdownItems = (editor: Editor): DropdownMenuItem[][] => {
	if (!selectedNode.value?.node?.type) {
		return []
	}

	return mapEditorItems(editor, [
		[
			{
				type: 'label',
				label: upperFirst(selectedNode.value.node.type),
			},
			{
				label: t('components.editor.dropdown.turnInto'),
				icon: 'i-tabler-repeat',
				children: suggestionItems,
			},
			{
				kind: 'clearFormatting',
				pos: selectedNode.value?.pos,
				label: t('components.editor.dropdown.resetFormatting'),
				icon: 'i-tabler-rotate',
			},
		],
		[
			{
				kind: 'duplicate',
				pos: selectedNode.value?.pos,
				label: t('components.editor.dropdown.duplicate'),
				icon: 'i-tabler-copy',
			},
			{
				label: t('components.editor.dropdown.copyToClipboard'),
				icon: 'i-tabler-clipboard',
				onSelect: async () => {
					if (!selectedNode.value) return

					const pos = selectedNode.value.pos
					const node = editor.state.doc.nodeAt(pos)
					if (node) {
						await navigator.clipboard.writeText(node.textContent)
					}
				},
			},
		],
		[
			{
				kind: 'moveUp',
				pos: selectedNode.value?.pos,
				label: t('components.editor.dropdown.moveUp'),
				icon: 'i-tabler-arrow-up',
			},
			{
				kind: 'moveDown',
				pos: selectedNode.value?.pos,
				label: t('components.editor.dropdown.moveDown'),
				icon: 'i-tabler-arrow-down',
			},
		],
		[
			{
				kind: 'delete',
				pos: selectedNode.value?.pos,
				label: t('components.editor.dropdown.delete'),
				icon: 'i-tabler-trash',
			},
		],
	]) as DropdownMenuItem[][]
}

const characterLimit = 1000
const tiptapExtensions = [SchemaSanitizer, CharacterCount.configure({ limit: characterLimit })]

const starterKitOpts: Partial<StarterKitOptions> = {
	link: false,
	code: false,
	codeBlock: false,
	blockquote: false,
	heading: false,
	horizontalRule: false,
}

const appendToBody = typeof document !== 'undefined' ? () => document.body : undefined
</script>

<template>
	<UEditor
		v-slot="{ editor, handlers }"
		v-model="state"
		content-type="json"
		class="w-full border border-default rounded min-h-12 max-h-100 overflow-y-auto"
		:placeholder="{ placeholder: 'Start writing...', includeChildren: true }"
		:extensions="tiptapExtensions"
		:starter-kit="starterKitOpts"
		:ui="{ base: 'p-8 sm:px-16' }"
	>
		<div
			class="sticky top-0 bg-neutral-50 z-10 flex items-center gap-3 px-2 pt-1 pb-1 text-xs text-muted tabular-nums border-b border-default"
		>
			<span class="flex items-center gap-1.5">
				<UIcon name="i-tabler-pencil" class="opacity-75" />
				<span>{{ editor.storage.characterCount.characters() }} / {{ characterLimit }}</span>
				<span class="opacity-75">{{ t('components.editor.counter.chars') }}</span>
				<span class="text-border">·</span>
				<span>{{ editor.storage.characterCount.words() }}</span>
				<span class="opacity-75">{{ t('components.editor.counter.words') }}</span>
			</span>
			<span v-if="jsonLimit" class="flex items-center gap-1.5">
				<UIcon name="i-tabler-braces" class="opacity-75" />
				<span :class="jsonSize! > jsonLimit ? 'text-error' : ''">
					{{ jsonSize?.toLocaleString() }} / {{ jsonLimit.toLocaleString() }}
				</span>
				<span class="opacity-75">{{ t('components.editor.counter.json') }}</span>
			</span>
		</div>
		<UEditorDragHandle v-slot="{ ui, onClick }" :editor="editor" @node-change="selectedNode = $event">
			<UButton
				icon="i-tabler-plus"
				color="neutral"
				variant="ghost"
				size="sm"
				:class="ui.handle()"
				@click="
					e => {
						e.stopPropagation()

						const selected = onClick()
						handlers.suggestion?.execute(editor, { pos: selected?.pos }).run()
					}
				"
			/>
			<UDropdownMenu
				v-slot="{ open }"
				:modal="false"
				:items="dropdownItems(editor)"
				:content="{ side: 'left' }"
				:ui="{ content: 'w-48', label: 'text-xs' }"
				@update:open="editor.chain().setMeta('lockDragHandle', $event).run()"
			>
				<UButton
					icon="i-tabler-grip-vertical"
					color="neutral"
					variant="ghost"
					active-variant="soft"
					size="sm"
					:active="open"
					:class="ui.handle()"
				/>
			</UDropdownMenu>
		</UEditorDragHandle>
		<UEditorSuggestionMenu :editor="editor" :items="suggestionItems" :append-to="appendToBody" />
		<UEditorToolbar :editor="editor" :items="toolbarItems" layout="bubble" />
	</UEditor>
</template>
