import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

const rootDir = import.meta.dirname

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: { allow: ['..'] },
  },
  resolve: {
    alias: {
      '@nucleo': path.resolve(rootDir, '../nucleo'),
    },
  },
  build: {
    // Mermaid se carga bajo demanda; el chunk puede superar 500 kB sin afectar la carga inicial.
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (
            id.includes('react-markdown') ||
            id.includes('remark') ||
            id.includes('micromark') ||
            id.includes('mdast') ||
            id.includes('marked')
          ) {
            return 'vendor-markdown'
          }
          if (id.includes('react-dom') || id.includes('/react/')) {
            return 'vendor-react'
          }
          if (id.includes('mermaid') || id.includes('cytoscape') || id.includes('dagre')) {
            return 'vendor-diagrams'
          }
          if (id.includes('@joint')) {
            return 'vendor-joint'
          }
        },
      },
    },
  },
})