import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  test: { include: ['tests/domain/**/*.test.{ts,js}'] },
});
