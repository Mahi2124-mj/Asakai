import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the build works from file:// inside the Capacitor WebView.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, host: true },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
});
