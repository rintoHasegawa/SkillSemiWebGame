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
        // autoUpdate は活性化直後に無条件リロードするため，
        // 適用タイミングをアプリ側で制御できる prompt を使う
        registerType: 'prompt',
        // 登録処理は src/pwa/appUpdater.ts で明示的に行う
        injectRegister: false,
        workbox: {
          // 活性化した Service Worker に既存タブの制御を引き継がせ，
          // 初回訪問セッションが最後まで管理外のまま残る窓を閉じる
          // （効能はこの初回訪問の窓に限られ，再デプロイ時のチャンク 404 対策の
          //   本体は src/pwa/chunkLoadRecovery.ts 側の復旧処理である）
          // 待機中の版を即時適用してしまう skipWaiting は #368 の更新ゲートを
          // 壊すため入れない
          // 副作用: vite-plugin-pwa の register は prompt モードでは waiting を
          // 受けた時点で controlling リスナを張り，isUpdate なら無条件でリロードする．
          // そのため「このページが管理外のまま，他の管理下クライアントが居て待機が
          // 発生 → その相手が閉じて新しい版が活性化 → claim でこのページを掴む」
          // 経路では，更新ゲートを通らないリロードが起こりうる
          // ※ 待機が発生しない初回訪問（インストール直後に活性化）ではリスナ自体が
          //   張られないため，clientsClaim だけでリロードが起きることはない
          clientsClaim: true,
          // SPAとして index.html へフォールバックさせる
          navigateFallback: 'index.html',
          // Socket.IO の通信をService Workerのキャッシュ対象から除外
          navigateFallbackDenylist: [/^\/socket\.io/],
          runtimeCaching: [
            {
              // 画像アセットをキャッシュして初回以降の読み込みを高速化
              urlPattern: /\.(?:png|webp|svg)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-assets',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30日
                },
              },
            },
          ],
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
        '@client': path.resolve(import.meta.dirname, 'src'),
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