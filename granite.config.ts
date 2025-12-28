import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'soul-lab',
  brand: {
    displayName: '소울 랩',
    primaryColor: '#0B1220',
    icon: '', // 아이콘 URL (없으면 ''로 둬도 됨)
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'tsc -b && vite build',
    },
  },
  permissions: [
    { name: 'contacts', access: 'read' },
    { name: 'clipboard', access: 'write' },
    { name: 'photos', access: 'read' },
  ],
});
