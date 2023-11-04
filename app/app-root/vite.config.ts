// @bangle-ignore-checks
import path from 'node:path';

import getEnvVars from '@bangle.io/env-vars';
import Unocss from '@unocss/vite';
import react from '@vitejs/plugin-react-swc';
import minimist from 'minimist';
import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import { ManifestOptions, VitePWA } from 'vite-plugin-pwa';

const HELP_DOCS_VERSION = '1.11.0';

const argv = minimist(process.argv.slice(2));

export default defineConfig(async ({ command, mode }) => {
  const isProduction = mode === 'production';
  const envVars = getEnvVars({
    isProduction: isProduction,
    isVite: true,
    helpDocsVersion: HELP_DOCS_VERSION,
  });

  const hot = envVars.hot;
  const port = argv.port;
  const appEnv = envVars.appEnv;

  const PWA = VitePWA({
    minify: false,
    registerType: 'autoUpdate',
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
  });

  return {
    plugins: [
      createHtmlPlugin({
        minify: isProduction,
        inject: {
          data: { ...envVars.htmlInjections },
        },
      }),
      react({}),
      Unocss(),
      PWA,
    ],
    publicDir: path.join(__dirname, 'public'),
  };
});

function generateManifest(appEnv: string): Partial<ManifestOptions> {
  const isProd = appEnv === 'production';
  let icons: ManifestOptions['icons'] = [];

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
  const manifest: Partial<ManifestOptions> = {
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
