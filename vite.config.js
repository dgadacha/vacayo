import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from '@vant/auto-import-resolver'
import { fileURLToPath, URL } from 'node:url'

// On GitHub Pages the app is served at /vacayo/; locally we use /.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/vacayo/' : '/',
  plugins: [
    vue(),
    Components({
      resolvers: [VantResolver()],
      dts: false
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: false
  }
}))
