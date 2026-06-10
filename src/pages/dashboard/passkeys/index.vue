<script lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Column } from '@tanstack/vue-table'
import type { CommandResponse, Passkey } from '@/types/tauri-types'

import { ref, useTemplateRef, resolveComponent, h } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useToast } from '@nuxt/ui/composables'
import { useConfirmDialog, useCopyPasskeyToServer } from '@/composables/useDialog'
import { usePasskeysListAll } from '@/loaders/passkeys'

import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
definePage({
  name: 'dashboard-passkeys'
})

const UButton = resolveComponent('UButton')

const confirmDialog = useConfirmDialog()
const toast = useToast()
const router = useRouter()
const { t, locale } = useI18n()
const { data: passkeys, isLoading, reload } = usePasskeysListAll()


const columns : TableColumn<Passkey>[] = [
  {
    id: 'expand',
    enableHiding: false,
    meta: {
      class: {
          td: 'w-5 whitespace-normal',
      },
    },
    cell: ({ row }) =>
      h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        icon: (row.getIsExpanded() ? 'i-tabler-eye-off' : 'i-tabler-eye'),
        square: true,
        'aria-label': 'Expand',
        onClick: () => row.toggleExpanded()
      })
  }, {
    accessorKey: 'id',
    header: '#'
  }, {
    accessorKey: 'name',
    header: t('pages.passkeys.table.columns.name')
  }, {
    accessorKey: 'key_type',
    header: t('pages.passkeys.table.columns.type')
  }, {
    accessorKey: 'fingerprint',
    header: t('pages.passkeys.table.columns.fingerprint')
  }, {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => h('div', { class: 'flex gap-2 justify-end' }, [
      h(UButton, { icon: 'i-tabler-pencil', color: 'info', variant: 'ghost', async onClick () {
        router.push({ name: 'dashboard-passkeys-id-edit', params: { id: row.original.id as number } })
      }}),
      h(UButton, {icon: 'i-tabler-server-cog', variant: 'ghost', color: 'neutral', async onClick() {
        const copyToServer = useCopyPasskeyToServer()
        await copyToServer({passkey: row.original})
      }}),
      h(UButton, { icon: 'i-tabler-trash', color: 'error', variant: 'ghost', async onClick() {
        const result = await confirmDialog({
          type: 'cancel_delete',
          title: t('common.delete.label'),
          description: t('common.delete.description', { name: row.original.name }),
        })

        if (result) {
          const notice = toast.add({
            title: t('pages.passkeys.toast.delete.loading.title'),
            description: t('pages.passkeys.toast.delete.loading.description', { name: row.original.name }),
            color: 'warning',
            icon: 'i-tabler-trash',
            duration: 0
          })

          const result = await invoke<CommandResponse>('crud_delete_passkey', { id: row.original.id})

          if (result.success) {
            toast.update(notice.id, {
              title: t('pages.passkeys.toast.delete.success.title'),
              description: t('pages.passkeys.toast.delete.success.description', { name: row.original.name }),
              color: 'success',
              icon: 'i-tabler-check',
              duration: undefined
            })
          } else {
            toast.update(notice.id, {
              title: t('pages.passkeys.toast.delete.error.title'),
              description: t('pages.passkeys.toast.delete.error.description', { name: row.original.name }),
              color: 'error',
              icon: 'i-tabler-x',
              duration: undefined
            })
          }

          await reload()
        }
      }})
    ])
  }
]

const table = useTemplateRef('table')
const columnVisibility = ref({})
const globalFilter = ref('')
const expanded = ref({})
</script>

<template>
  <div v-if="isLoading || passkeys.length > 0" class="flex flex-col flex-1 w-full">
    <div class="flex py-3.5 border-b border-accented justify-between">
      <GlobalFilter v-model="globalFilter" />
      <ToogleColumVisibility :table-api="table?.tableApi" />
    </div>
    <UTable
      v-model:expanded="expanded"
      v-model:column-visibility="columnVisibility"
      v-model:global-filter="globalFilter"
      ref="table"
      sticky
      :loading="isLoading"
      :data="passkeys"
      :columns="columns"
      :ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
    >
      <template #expanded="{ row }">
        <UCard :description="row.original.description || undefined">
            <template #title>
              <div class="flex items-center justify-between">
                <div class="flex gap-3 items-center">
                  <span class="text-lg font-semibold">{{ row.original.name }}</span>
                  <UBadge color="neutral" variant="soft" size="sm" class="font-mono">
                    ID: {{ row.original.id }}
                  </UBadge>
                </div>
                <UBadge color="info" variant="subtle" icon="i-tabler-key">
                  {{ row.original.key_type?.toLocaleUpperCase() }}
                </UBadge>
              </div>
            </template>

            <template #default>
              <!-- Grid de detalles -->
              <div class="grid grid-cols-1 md:grid-cols-4 gap-6">

                <div class="flex flex-col gap-1">
                  <span class="text-xs text-muted font-medium">{{ t('entity.passkey.key_content') }}</span>
                  <span class="text-sm font-mono text-foreground flex items-center gap-1.5">
                    <UIcon name="i-tabler-lock" class="text-muted size-4" />
                    <span class="font-mono text-xs">
                      ••••••••••••••••••••••••••••<br />
                      ••••••••••••••••••••••••••••
                    </span>
                  </span>
                </div>

                <div class="flex flex-col gap-1 col-span-2">
                  <span class="text-xs text-muted font-medium">{{ t('entity.passkey.fingerprint') }}</span>
                  <span class="text-sm font-mono text-foreground flex items-center gap-1.5">
                    <UIcon name="i-tabler-fingerprint" class="text-muted size-4" />
                    {{ row.original.fingerprint }}
                  </span>
                </div>

                <div class="flex flex-col gap-1">
                  <span class="text-xs text-muted font-medium">
                    {{t('entity.passkey.passphrase') }}
                  </span>
                  <span class="text-sm text-foreground flex items-center gap-2">
                    <template v-if="row.original.passphrase?.startsWith('ENC:')">
                      <UIcon name="i-tabler-lock" class="text-muted size-4" />
                      <UBadge variant="subtle" size="sm" color="success" class="font-mono">
                        <span class="font-mono text-xs">•••••••••••</span>
                      </UBadge>
                    </template>
                    <template v-else>
                      <UIcon name="i-tabler-lock-open" class="text-muted size-4" />
                      <UBadge variant="subtle" size="sm" color="warning" class="font-mono">
                        <span class="font-mono text-xs">{{ t('common.empty') }}</span>
                      </UBadge>
                    </template>
                  </span>
                </div>
              </div>
            </template>

            <template #footer>
              <div class="flex gap-4 items-center justify-between text-xs text-muted">
                <span class="flex gap-1.5 items-center">
                  <UIcon name="i-tabler-calendar-plus" class="size-4" />
                  <strong>{{ t('entity.host.created_at') }}:</strong>
                  {{ new Date(row.original.created_at).toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' }) }}
                </span>
                <span class="flex gap-1.5 items-center">
                  <UIcon name="i-tabler-calendar-time" class="size-4" />
                  <strong>{{ t('entity.host.updated_at') }}:</strong>
                  {{ new Date(row.original.updated_at).toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' }) }}
                </span>
              </div>
            </template>
        </UCard>
      </template>
    </UTable>
  </div>
  <UEmpty
    v-else
    icon="i-tabler-key"
    :title="t('pages.passkeys.table.empty.title')"
    :description="t('pages.passkeys.table.empty.description')"
    :actions="[
        {
          icon: 'i-tabler-plus',
          label: t('components.navigation.add.passkey.label'),
          to: {name: 'dashboard-passkeys-add'}
        },
        {
          icon: 'i-tabler-refresh',
          label: t('common.refresh'),
          color: 'neutral',
          variant: 'soft',
          onClick: () => reload()
        }
      ]"
  />
</template>