import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this repo under /cosmic-explorer/, so production builds
// use that base path; dev and test stay at root so Vitest is unaffected.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/cosmic-explorer/' : '/',
  plugins: [react()],
  server: { port: 3000 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
}));
