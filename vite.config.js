// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      buffer: 'buffer', // Polyfill buffer
    },
  },
  define: {
    'process.env': {}, // Some packages expect process.env to exist
  },
  optimizeDeps: {
    include: ['buffer'],
  },
});