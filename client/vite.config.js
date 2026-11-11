import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, las llamadas a /api se mandan al servidor Node (puerto 3000)
export default defineConfig({
  plugins: [react()],
  // La página compilada va a /public: así Vercel la sirve directo
  build: {
    outDir: '../public',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});