/* eslint-disable no-process-env */
import reactRefresh from '@vitejs/plugin-react-refresh';
import { injectHtml, minifyHtml } from 'vite-plugin-html';
import { VitePWA } from 'vite-plugin-pwa';

import getEnvVars from '@bangle.io/env-vars';

const argv = require('minimist')(process.argv.slice(2));

const config = async ({ command, mode }) => {
  const isProduction = mode === 'production';
  const envVars = await getEnvVars({
    isProduction: isProduction,
    isVite: true,
  });

  const hot = JSON.parse(envVars.appEnvs['process.env.BANGLE_HOT']);
  const port = argv.port;

  // NOTE: we are relying on cli passing port
  // as I couldnt find a reliable way to get the port
  // from vite. and we need port to do the proxy hack below
  if (command !== 'build' && !port) {
    throw new Error('Port must be defined');
  }

  if (isProduction && hot) {
    throw new Error('Hot not allowed in production');
  }
  if (hot) {
    console.info('**** RUNNING IN HOT RELOAD MODE ****');
  }

  const appEnv = envVars.appEnv;
  let sourcemap = true;
  // if (appEnv === 'production') {
  //   sourcemap = false;
  // }

  // deleting CHANGELOG_TEXT since it becomes really long when printing
  const printableConfig = Object.assign({}, envVars.appEnvs);
  delete printableConfig['process.env.CHANGELOG_TEXT'];
  console.table(printableConfig);

  /**
   * @type {import('vite').UserConfig}
   */
  const c = {
    build: {
      target: 'es2018',
      sourcemap: sourcemap,
      emptyOutDir: true,
      outDir: './build',
      chunkSizeWarningLimit: 3000,
    },
    worker: {
      format: 'es',
    },
    plugins: [
      minifyHtml(),
      injectHtml({
        injectData: {
          ...envVars.htmlInjections,
        },
      }),
      hot && reactRefresh(),
      VitePWA({
        minify: false,
        includeAssets: [
          'favicon.svg',
          'favicon-dev.svg',
          'favicon-staging.svg',
          'favicon.ico',
          'favicon-dev.ico',
          'favicon-staging.ico',
          'robots.txt',
          'apple-touch-icon.png',
        ],
        manifest: generateManifest(appEnv),
      }),
    ],
    publicDir: './tooling/public',
    define: {
      ...envVars.appEnvs,
    },
    server: {
      strictPort: true,
      hmr: hot,
      proxy: {
        // string shorthand
        '^.*\\.md$': {
          target: 'http://localhost:' + port,
          rewrite: (path) => path.split('.md').join(''),
        },
      },
    },
  };

  return c;
};

function generateManifest(appEnv) {
  const isProd = appEnv === 'production';
  let icons = [];

  if (isProd) {
    icons = [
      {
        src: 'maskable_icon_x48.png',
        sizes: '48x48',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'maskable_icon_x128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'maskable_icon_x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'maskable_icon_x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'maskable_icon_x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'maskable_icon_x1024.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'maskable',
      },

      {
        src: 'icon-transparent_x128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'icon-transparent_x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'icon-transparent_x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ];
  } else if (appEnv === 'staging') {
    icons = [
      {
        src: 'icon-transparent-staging_x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ];
  } else {
    icons = [
      {
        src: 'icon-transparent-dev_x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ];
  }
  const manifest = {
    name: 'bangle.io' + (isProd ? '' : '/' + appEnv),
    short_name: 'bangle',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'minimal-ui',
    start_url: '/?type=installed_pwa',
    icons,
  };

  return manifest;
}

export default config;
