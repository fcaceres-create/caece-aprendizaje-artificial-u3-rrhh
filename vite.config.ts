/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { chunkSizeWarningLimit: 1500 },
  server: { port: 5181, strictPort: true, open: '/#resumen', fs: { allow: ['.'] } },
  preview: { port: 4181, strictPort: true },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
