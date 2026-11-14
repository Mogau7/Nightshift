import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const backend = 'http://127.0.0.1:3001';

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173, proxy: { '/api': backend } },
  preview: { host: true, port: 4173, proxy: { '/api': backend } },
});
