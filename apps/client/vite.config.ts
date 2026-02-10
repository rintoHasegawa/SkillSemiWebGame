import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact()],
  server: {
    host: true,        // 0.0.0.0 でリッスンして外部アクセスを許可
    port: 5173,        // ポート固定
    watch: {
      usePolling: true // WSL2/Docker間のファイル変更検知を確実にする
    }
  }
})
