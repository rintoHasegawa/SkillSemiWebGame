import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { config } from '@repo/shared'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  return {
    plugins: [react()],
    server: isProd
      ? undefined
      : {
          proxy: {
            '/socket.io': {
              target: config.NETWORK_CONFIG.DEV_SERVER_URL,
              ws: true,
            },
          },
        },
  }
})