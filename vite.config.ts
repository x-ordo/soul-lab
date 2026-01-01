import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

// Use real Toss packages when VITE_USE_TOSS_SDK=true (in Toss WebView environment)
const useTossSdk = process.env.VITE_USE_TOSS_SDK === 'true';

export default defineConfig({
  plugins: [
    react(),
    // Gzip compression (most compatible)
    compression({ algorithm: 'gzip', ext: '.gz' }),
    // Brotli compression (better ratio, modern browsers)
    compression({ algorithm: 'brotliCompress', ext: '.br' }),
    // Bundle analyzer - generates stats.html on build
    visualizer({
      filename: 'stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    port: 5173,
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunk: React ecosystem + third-party libs
          if (id.includes('node_modules')) {
            // React core
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router')
            ) {
              return 'vendor-react';
            }
            // Korean lunar calendar (used by empathy engine)
            if (id.includes('korean-lunar-calendar')) {
              return 'vendor-lunar';
            }
          }

          // Fortune data chunk: templates and copy variants
          if (
            id.includes('src/data/fortuneTemplates') ||
            id.includes('src/lib/copyVariants')
          ) {
            return 'fortune-data';
          }

          // Tarot data chunk: cards and tarot engine
          if (
            id.includes('src/data/tarotCards') ||
            id.includes('src/lib/tarot')
          ) {
            return 'tarot-data';
          }

          // Empathy data chunk: empathy parts templates
          if (id.includes('src/data/empathyParts')) {
            return 'empathy-data';
          }

          // Core utils chunk: seed, attribution, analytics
          if (
            id.includes('src/lib/seed') ||
            id.includes('src/lib/attribution') ||
            id.includes('src/lib/analytics')
          ) {
            return 'core-utils';
          }

          // Reward utils chunk: reward, streak, streakBonus
          if (
            id.includes('src/lib/reward') ||
            id.includes('src/lib/streak') ||
            id.includes('src/lib/streakBonus')
          ) {
            return 'reward-utils';
          }
        },
      },
    },
  },
  esbuild: {
    drop: ['debugger'],
    charset: 'utf8',
    legalComments: 'none',
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
