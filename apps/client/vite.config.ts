import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { config } from '@repo/shared'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  const socketPath = config.NETWORK_CONFIG.SOCKET_IO_PATH

  return {
    plugins: [react()],
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