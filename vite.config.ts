import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import vueDevTools from 'vite-plugin-vue-devtools'
import ui from '@nuxt/ui/vite'
import vueLayouts from 'vite-plugin-vue-layouts'
import vueRouter from 'vue-router/vite'
import { resolve } from 'path'

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    vueRouter(),
    vue(),
    ui({
      ui: {
        colors: {
          primary: 'blue',
          neutral: 'zinc'
        },
        icons: {
          arrowDown: 'i-tabler-arrow-down',
          arrowLeft: 'i-tabler-arrow-left',
          arrowRight: 'i-tabler-arrow-right',
          arrowUp: 'i-tabler-arrow-up',
          caution: 'i-tabler-alert-square-rounded',
          check: 'i-tabler-check',
          chevronDoubleLeft: 'i-tabler-chevrons-left',
          chevronDoubleRight: 'i-tabler-chevrons-right',
          chevronDown: 'i-tabler-chevron-down',
          chevronLeft: 'i-tabler-chevron-left',
          chevronRight: 'i-tabler-chevron-right',
          chevronUp: 'i-tabler-chevron-up',
          close: 'i-tabler-x',
          copy: 'i-tabler-copy',
          copyCheck: 'i-tabler-copy-check',
          dark: 'i-tabler-moon',
          drag: 'i-tabler-grip-vertical',
          ellipsis: 'i-tabler-dots',
          error: 'i-tabler-square-rounded-x',
          external: 'i-tabler-external-link',
          eye: 'i-tabler-eye',
          eyeOff: 'i-tabler-eye-off',
          file: 'i-tabler-file',
          folder: 'i-tabler-folder',
          folderOpen: 'i-tabler-folder-open',
          hash: 'i-tabler-hash',
          info: 'i-tabler-info-square-rounded',
          light: 'i-tabler-sun',
          loading: 'i-tabler-loader-2',
          menu: 'i-tabler-menu',
          minus: 'i-tabler-minus',
          panelClose: 'i-tabler-layout-sidebar-left-collapse',
          panelOpen: 'i-tabler-layout-sidebar-left-expand',
          plus: 'i-tabler-plus',
          reload: 'i-tabler-reload',
          search: 'i-tabler-search',
          stop: 'i-tabler-player-stop',
          success: 'i-tabler-square-rounded-check',
          system: 'i-tabler-device-desktop',
          tip: 'i-tabler-bulb',
          upload: 'i-tabler-upload',
          warning: 'i-tabler-alert-triangle'
        }
      }
    }),
    vueDevTools(),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },

  build: {
    target: 'esnext',
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
