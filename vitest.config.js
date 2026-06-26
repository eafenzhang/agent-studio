import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{js,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,ts,tsx}'],
      exclude: [
        'src/main.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
