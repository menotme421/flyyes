import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  // WHY: Mirrors the official Carbon + Vite example — pre-bundles Carbon for
  // a faster dev server (Carbon is a large dependency).
  optimizeDeps: {
    include: ['@carbon/react'],
  },
  // WHY: Mutes the Sass if-function deprecation noise from Carbon's own
  // stylesheets (written for older Sass), not our code.
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['if-function'],
      },
    },
  },
})
