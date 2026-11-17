<script setup lang="ts">
import type { JSONContent } from '@tiptap/core'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { ModulesName } from '@/utils/deployer-app'
import { ICONS } from '@/utils/icons'

/** Campo de solo lectura mostrado en el detalle de una fila de la papelera. */
interface TrashDetailField {
	key: string
	label: string
	value?: string | number | boolean
	/** Valor mostrado con tipografía monoespaciada. */
	mono?: boolean
	/** Valor mostrado como bloque de código preformateado. */
	pre?: boolean
	/** Ocupa todo el ancho de la cuadrícula. */
	wide?: boolean
}

const props = defineProps<{
	module: ModulesName
	item: Record<string, any>
}>()

const { t } = useI18n()

const idField = computed(() => (props.module === ModulesName.Commands ? 'key' : 'id'))
const id = computed(() => props.item[idField.value] as number | string)
const name = computed(() => String(props.item.name ?? id.value))
const description = computed(() => props.item.description as JSONContent | undefined)
const enabled = computed(() => props.item.enabled as boolean | undefined)

const yesNo = (value: unknown) => t(value ? 'common.common.yes' : 'common.common.no')

const fields = computed<TrashDetailField[]>(() => {
	const item = props.item

	switch (props.module) {
		case ModulesName.Variables:
			return [
				{ key: 'slug', label: t('entity.common.slug'), value: item.slug, mono: true },
				{ key: 'value', label: t('entity.variable.value'), value: item.value, mono: true },
				{ key: 'is_secret', label: t('entity.variable.is_secret'), value: yesNo(item.is_secret) },
				{ key: 'enabled', label: t('entity.common.enabled'), value: yesNo(item.enabled) },
			]

		case ModulesName.Hosts:
			return [
				{ key: 'host', label: t('entity.host.host'), value: item.host, mono: true },
				{ key: 'port', label: t('entity.host.port'), value: item.port },
				{ key: 'username', label: t('entity.host.username'), value: item.username, mono: true },
				{ key: 'auth_type', label: t('entity.host.auth_type'), value: item.auth_type },
				{ key: 'key_id', label: t('entity.host.key_id'), value: item.key_id ?? t('common.common.none') },
				{ key: 'password', label: t('entity.host.password'), value: item.password ?? undefined, mono: true },
				{ key: 'enabled', label: t('entity.common.enabled'), value: yesNo(item.enabled) },
			]

		case ModulesName.Commands:
			return [
				{ key: 'key', label: t('entity.command.key'), value: item.key, mono: true },
				{ key: 'timeout', label: t('entity.command.timeout'), value: `${item.timeout}s` },
				{ key: 'parser', label: t('entity.command.parser'), value: item.parser?.type },
				{ key: 'enabled', label: t('entity.common.enabled'), value: yesNo(item.enabled) },
				{ key: 'command', label: t('entity.command.command'), value: item.command, pre: true, wide: true },
			]

		case ModulesName.Passkeys:
			return [
				{ key: 'key_type', label: t('entity.passkey.key_type'), value: item.key_type },
				{
					key: 'fingerprint',
					label: t('entity.passkey.fingerprint'),
					value: item.fingerprint ?? undefined,
					mono: true,
					wide: true,
				},
				{
					key: 'public_key',
					label: t('entity.passkey.key_public'),
					value: item.public_key ?? undefined,
					mono: true,
					wide: true,
				},
				{ key: 'passphrase', label: t('entity.passkey.passphrase'), value: item.passphrase ?? undefined, mono: true },
				{
					key: 'key_content',
					label: t('entity.passkey.key_content'),
					value: item.key_content ?? undefined,
					mono: true,
					wide: true,
				},
				{ key: 'enabled', label: t('entity.common.enabled'), value: yesNo(item.enabled) },
			]

		default:
			return []
	}
})
</script>

<template>
	<ItemCard
		:id="id"
		:name="name"
		:description="description"
		:enabled="enabled"
		:created_at="item.created_at"
		:updated_at="item.updated_at"
	>
		<template #title-right>
			<UBadge
				v-if="module === ModulesName.Commands && item.internal"
				variant="soft"
				:icon="ICONS.server.deviceDesktop"
				:label="t('entity.command.internal')"
			/>
			<UBadge
				v-else-if="module === ModulesName.Passkeys"
				color="info"
				variant="subtle"
				:icon="ICONS.auth.key"
				:label="item.key_type"
			/>
		</template>

		<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<div
				v-for="field in fields"
				:key="field.key"
				class="flex min-w-0 flex-col gap-1"
				:class="field.wide ? 'sm:col-span-2 lg:col-span-3' : ''"
			>
				<dt class="text-xs text-muted font-medium">{{ field.label }}</dt>
				<dd v-if="field.pre" class="min-w-0">
					<pre class="bg-elevated rounded-md p-3 font-mono text-xs whitespace-pre-wrap break-all">{{
						field.value
					}}</pre>
				</dd>
				<dd v-else class="text-sm text-foreground" :class="field.mono ? 'font-mono break-all' : ''">
					<ValueViewer :value="field.value" only-text />
				</dd>
			</div>
		</dl>
	</ItemCard>
</template>
