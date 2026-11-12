import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// The site must be served from the same origin as the JiYan API: the auth
// endpoints and the cloud panel session cookie are same-origin only.
// For local development we proxy to the public site instead of hard-coding a host.
const devTarget = process.env.JIYAN_DEV_TARGET || 'https://jiyan.xn--0try77c6um82w.cn';

export default defineConfig({
  plugins: [vue()],
  build: { target: 'es2020' },
  server: {
    proxy: {
      '/api': { target: devTarget, changeOrigin: true, secure: true },
      '/cloud-control.php': { target: devTarget, changeOrigin: true, secure: true },
    },
  },
});
