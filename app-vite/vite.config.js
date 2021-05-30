/* eslint-disable no-process-env */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import getEnvVars from 'env-vars';
import { minifyHtml, injectHtml } from 'vite-plugin-html';

const config = ({ command, mode }) => {
  const isProduction = mode === 'production';
  const PORT = isProduction ? 5000 : 4000;
  const envVars = getEnvVars({ isProduction: isProduction, isVite: true });

  /**
   * @type {import('vite').UserConfig}
   */
  const c = {
    // plugins: [reactRefresh()],
    build: {
      target: 'es2018',
      sourcemap: isProduction ? false : true,
      emptyOutDir: true,
      outDir: '../build',
    },
    plugins: [
      minifyHtml(),
      injectHtml({
        injectData: {
          ...envVars.htmlInjections,
        },
      }),
    ],

    exclude: [
      // '@bangle.dev/collab-client',
      // '@bangle.dev/collab-server',
      // '@bangle.dev/markdown-front-matter',
      // '@bangle.dev/react-emoji-suggest',
      // '@bangle.dev/react-sticker',
      // '@bangle.dev/react-stopwatch',
      // '@bangle.dev/text-formatting',
      // '@bangle.dev/timestamp',
      // '@bangle.dev/trailing-node',
      // '@bangle.dev/wiki-link',
      // '@bangle.dev/core',
      // '@bangle.dev/emoji',
      // '@bangle.dev/markdown',
      // '@bangle.dev/react',
      // '@bangle.dev/react-menu',
      // '@bangle.dev/table',
      // '@bangle.dev/tooltip',
    ],
    define: {
      ...envVars.appEnvs,
    },
    server: {
      port: PORT,
      strictPort: true,
      // hmr: false,
      proxy: {
        // string shorthand
        '^.*\\.md$': {
          target: 'http://localhost:' + PORT,
          rewrite: (path) => path.split('.md').join(''),
        },
      },
    },
  };

  return c;
};

export default config;
