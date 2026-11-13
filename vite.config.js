import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O Vite só serve para transformar os componentes React em HTML (prerender.mjs); o script do browser é montado pelo esbuild.
export default defineConfig({ plugins: [react()], logLevel: 'warn', build: { ssr: 'src/entry-server.jsx', outDir: '.ssr', emptyOutDir: true } });
