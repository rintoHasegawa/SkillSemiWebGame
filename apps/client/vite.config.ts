import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { config } from './src/config/index.ts'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  const socketPath = config.NETWORK_CONFIG.SOCKET_IO_PATH

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          // SPAとして index.html へフォールバックさせる
          navigateFallback: 'index.html',
          // Socket.IO の通信をService Workerのキャッシュ対象から除外
          navigateFallbackDenylist: [/^\/socket\.io/],
          runtimeCaching: [],
        },
        manifest: {
          name: 'PixelPaintWar',
          short_name: 'PxPaintWar',
          description: 'リアルタイム対戦ペイントゲーム',
          theme_color: '#111111',
          background_color: '#111111',
          display: 'fullscreen',
          orientation: 'landscape',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@client': path.resolve(__dirname, 'src'),
      },
    },
    server: isProd
      ? undefined
      : {
          proxy: {
            [socketPath]: {
              target: config.NETWORK_CONFIG.DEV_SERVER_URL,
              ws: true,
            },
          },
        },
  }
})