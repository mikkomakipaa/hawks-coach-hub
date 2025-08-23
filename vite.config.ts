import { defineConfig } from 'vite'
import { resolve } from 'path'
import { apiProxy } from './vite-api-proxy.js'

export default defineConfig({
  plugins: [apiProxy()],
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
    target: 'es2020',
    minify: 'terser',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 8000,
    open: true,
  },
  preview: {
    port: 8000,
  },
})