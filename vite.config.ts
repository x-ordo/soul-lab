import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      // Mock Toss packages for local development
      '@toss/tds-mobile-ait': path.resolve(__dirname, 'src/mocks/tds-mobile-ait.tsx'),
      '@apps-in-toss/web-framework': path.resolve(__dirname, 'src/mocks/web-framework.ts'),
      '@toss/tds-mobile': path.resolve(__dirname, 'src/mocks/tds-mobile-ait.tsx'),
    },
  },
});
