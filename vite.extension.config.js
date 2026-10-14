import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
export default defineConfig({ root: 'extension', base: './', plugins: [vue()], build: { outDir: '../extension-dist', emptyOutDir: true, rollupOptions: { input: { gallery: resolve('extension/gallery.html'), popup: resolve('extension/popup.html') } } } })
