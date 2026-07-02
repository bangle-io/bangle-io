import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const packageDir = dirname(fileURLToPath(import.meta.url));
const nodeBuiltins = [
  ...builtinModules,
  ...builtinModules.map((id) => `node:${id}`),
];

export default defineConfig({
  ssr: {
    noExternal: ['electron-updater'],
  },
  build: {
    emptyOutDir: true,
    ssr: true,
    lib: {
      entry: {
        main: resolve(packageDir, 'src/main.ts'),
        preload: resolve(packageDir, 'src/preload.ts'),
      },
      formats: ['cjs'],
    },
    outDir: 'dist',
    rollupOptions: {
      external: ['electron', ...nodeBuiltins],
      output: {
        entryFileNames: '[name].cjs',
      },
    },
    sourcemap: true,
    target: 'node22',
  },
});
