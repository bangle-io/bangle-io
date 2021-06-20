/* eslint-disable no-process-env */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import getEnvVars from 'env-vars';
import { minifyHtml, injectHtml } from 'vite-plugin-html';

const argv = require('minimist')(process.argv.slice(2));

const config = ({ command, mode }) => {
  const isProduction = mode === 'production';
  const envVars = getEnvVars({ isProduction: isProduction, isVite: true });
  /**
   * @type {import('vite').UserConfig}
   */

  const port = argv.port;
  // NOTE: we are relying on cli passing port
  // as I couldnt find a reliable way to get the port
  // from vite. and we need port to do the proxy hack below
  if (command !== 'build' && !port) {
    throw new Error('Port must be defined');
  }

  const c = {
    // plugins: [reactRefresh()],
    build: {
      target: 'es2018',
      sourcemap: isProduction
        ? process.env.CONTEXT === 'branch-deploy'
          ? true
          : false
        : true,
      // sourcemap: true,
      emptyOutDir: true,
      outDir: './build',
    },
    plugins: [
      minifyHtml(),
      injectHtml({
        injectData: {
          ...envVars.htmlInjections,
        },
      }),
    ],
    publicDir: './tooling/public',

    define: {
      ...envVars.appEnvs,
    },
    server: {
      strictPort: true,
      // hmr: false,
      proxy: {
        // string shorthand
        '^.*\\.md$': {
          target: 'http://localhost:' + port,
          rewrite: (path) => path.split('.md').join(''),
        },
      },
    },

    // optimizeDeps: {
    //   exclude: [
    //     '@bangle.dev/collab-client',
    //     '@bangle.dev/collab-server',
    //     '@bangle.dev/markdown-front-matter',
    //     '@bangle.dev/react-emoji-suggest',
    //     '@bangle.dev/react-sticker',
    //     '@bangle.dev/react-stopwatch',
    //     '@bangle.dev/text-formatting',
    //     '@bangle.dev/timestamp',
    //     '@bangle.dev/trailing-node',
    //     '@bangle.dev/wiki-link',
    //     '@bangle.dev/core',
    //     '@bangle.dev/emoji',
    //     '@bangle.dev/markdown',
    //     '@bangle.dev/react',
    //     '@bangle.dev/react-menu',
    //     '@bangle.dev/table',
    //     '@bangle.dev/tooltip',
    //   ],
    // },
  };

  return c;
};

export default config;
