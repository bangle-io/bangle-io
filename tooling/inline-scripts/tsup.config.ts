import path from 'node:path';

import { defineConfig } from 'tsup';

const appRoot = path.dirname(
  import.meta.resolve('@bangle.io/app-root').split('file://')[1]!,
);

export default defineConfig({
  format: 'iife',
  entry: ['inline-scripts.ts'],
  treeshake: true,
  splitting: false,
  dts: false,
  shims: false,
  clean: false,
  name: 'inline-scripts',
  outDir: path.join(appRoot, 'public', 'auto-generated'),
});
