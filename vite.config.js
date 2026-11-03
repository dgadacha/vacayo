import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from '@vant/auto-import-resolver'
import { fileURLToPath, URL } from 'node:url'

// Served from the domain root, on Vercel as in dev.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: '/',
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
      strictPort: false,
      // Dev-only AI proxy: put ANTHROPIC_API_KEY and VITE_AI_PROXY_URL=/anthropic in
      // .env.local — the dev server adds the key, so it never reaches the browser.
      proxy: env.ANTHROPIC_API_KEY
        ? {
            '/anthropic': {
              target: 'https://api.anthropic.com',
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/anthropic/, ''),
              configure: (proxy) => proxy.on('proxyReq', (req) => {
                req.removeHeader('authorization')
                req.setHeader('x-api-key', env.ANTHROPIC_API_KEY)
              })
            }
          }
        : undefined
    }
  }
})
