import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  base: '/bio/',
  build: {
    rollupOptions: {
      input: {
        biolog: resolve(rootDir, 'src/main.tsx')
      },
      output: {
        entryFileNames: 'assets/biolog.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: assetInfo => assetInfo.name?.endsWith('.css')
          ? 'assets/biolog.css'
          : 'assets/[name]-[hash][extname]'
      }
    }
  },
  test: {
    environment: 'node',
    globals: true
  }
})
