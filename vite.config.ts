import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({

  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          // Split out big/rarely-needed deps so main chunk stays smaller
          if (id.includes('firebase')) return 'vendor-firebase'
          if (id.includes('recharts') || id.includes('/d3-')) return 'vendor-charts'

          // UI-heavy libs
          if (
            id.includes('@mui/') ||
            id.includes('@radix-ui/') ||
            id.includes('lucide-react') ||
            id.includes('sonner') ||
            id.includes('next-themes') ||
            id.includes('motion')
          ) {
            return 'vendor-ui'
          }

          return 'vendor'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api/stooq': {
        target: 'https://stooq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/stooq/, ''),
      },
      '/api/alphavantage': {
        target: 'https://www.alphavantage.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/alphavantage/, ''),
      },
    },
  },

})
