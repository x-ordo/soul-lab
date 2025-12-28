import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Use real Toss packages when VITE_USE_TOSS_SDK=true (in Toss WebView environment)
const useTossSdk = process.env.VITE_USE_TOSS_SDK === 'true';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  resolve: {
    alias: useTossSdk
      ? {}
      : {
          // Mock Toss packages for standalone deployment
          '@toss/tds-mobile-ait': path.resolve(__dirname, 'src/mocks/tds-mobile-ait.tsx'),
          '@apps-in-toss/web-framework': path.resolve(__dirname, 'src/mocks/web-framework.ts'),
          '@toss/tds-mobile': path.resolve(__dirname, 'src/mocks/tds-mobile.tsx'),
        },
  },
});
