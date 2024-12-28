import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  shims: true,
  clean: true,
  format: ['cjs', 'esm'],
});
