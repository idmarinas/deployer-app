import type { TableColumn } from "@nuxt/ui"

import { h } from "vue"

import { useI18n } from "vue-i18n"

import UButton from "@nuxt/ui/components/Button.vue"
import UBadge from "@nuxt/ui/components/Badge.vue"

export function useTableColumns<T>() {
  const { t } = useI18n();

  const expandColumn: TableColumn<T> = {
    id: "expand",
    enableHiding: false,
    cell: ({ row }) =>
      h(UButton, {
        color: "neutral",
        variant: "ghost",
        icon: row.getIsExpanded() ? "i-tabler-eye-off" : "i-tabler-eye",
        square: true,
        "aria-label": "Expand",
        onClick: () => row.toggleExpanded(),
      }),
  };

  const enabledColumn: TableColumn<T> = {
    accessorKey: "enabled",
    header: t("pages.hosts.table.columns.enabled"),
    cell({ row }) {
      const label = row.getValue("enabled") ? t("common.active") : t("common.inactive");
      const color = row.getValue("enabled") ? "success" : "error";
      const icon = row.getValue("enabled") ? "i-tabler-check" : "i-tabler-x";

      return h(UBadge, { label, color, icon });
    },
  };

  return {
    tableColumnExpand: expandColumn,
    tableColumnEnabled: enabledColumn,
  };
}
