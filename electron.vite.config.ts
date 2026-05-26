import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: 'electron/main.ts'
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: 'electron/preload.ts'
        }
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: {
          index: 'index.html'
        }
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
