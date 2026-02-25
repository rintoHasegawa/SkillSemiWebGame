import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { config } from './src/config/index.ts'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  const socketPath = config.NETWORK_CONFIG.SOCKET_IO_PATH

  return {
    plugins: [react()],
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