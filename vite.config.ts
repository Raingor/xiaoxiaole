import { defineConfig } from 'vite';

export default defineConfig({
  // Local development stays at /; Pages builds use /xiaoxiaole/.
  base: process.env.PAGES_BASE || '/',
});
