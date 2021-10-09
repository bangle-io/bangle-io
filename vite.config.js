/* eslint-disable no-process-env */
import getEnvVars from 'env-vars';
import { minifyHtml, injectHtml } from 'vite-plugin-html';
import reactRefresh from '@vitejs/plugin-react-refresh';

const argv = require('minimist')(process.argv.slice(2));

const config = ({ command, mode }) => {
  const isProduction = mode === 'production';
  const envVars = getEnvVars({ isProduction: isProduction, isVite: true });
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

  let sourcemap = true;
  if (envVars.appEnv === 'production') {
    sourcemap = false;
  }
  console.table(envVars.appEnvs);
  /**
   * @type {import('vite').UserConfig}
   */
  const c = {
    build: {
      target: 'es2018',
      sourcemap: sourcemap,
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
      hot && reactRefresh(),
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

export default config;
