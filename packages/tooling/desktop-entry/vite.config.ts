import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const packageDir = dirname(fileURLToPath(import.meta.url));
const nodeBuiltins = [
  ...builtinModules,
  ...builtinModules.map((id) => `node:${id}`),
];

// Build one entry per invocation so each output is a fully self-contained CJS
// bundle (`codeSplitting: false` requires a single input). This matters for the
// sandboxed Electron preload: it can only `require` electron/node builtins,
// never a sibling chunk, so main and preload must not share an emitted chunk.
// The `build` script runs this twice (main, then preload).
const entry =
  process.env.BANGLE_DESKTOP_ENTRY === 'preload' ? 'preload' : 'main';

export default defineConfig({
  ssr: {
    noExternal: ['electron-updater'],
  },
  build: {
    // Only the first (main) pass clears dist; the preload pass appends to it.
    emptyOutDir: entry === 'main',
    ssr: true,
    lib: {
      entry: { [entry]: resolve(packageDir, `src/${entry}.ts`) },
      formats: ['cjs'],
    },
    outDir: 'dist',
    rollupOptions: {
      external: ['electron', ...nodeBuiltins],
      output: {
        entryFileNames: '[name].cjs',
        codeSplitting: false,
      },
    },
    sourcemap: true,
    target: 'node22',
  },
});
