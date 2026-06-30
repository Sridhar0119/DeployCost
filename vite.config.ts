import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'lucide-react',
        'axios',
        'recharts',
        'motion',
      ],
    },

    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',

      // Ignore SQLite database files to prevent continuous page reloads.
      watch: process.env.DISABLE_HMR === 'true'
        ? null
        : {
            ignored: [
              '**/data/**',
              '**/*.db',
              '**/*.db-wal',
              '**/*.db-shm',
            ],
          },
    },
  };
});