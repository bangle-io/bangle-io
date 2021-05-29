/* eslint-disable no-process-env */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import envVars from 'env-vars';

// https://vitejs.dev/config/
const config = ({ command, mode }) => {
  const isProduction = mode === 'production';
  const PORT = isProduction ? 5000 : 4000;
  let html = fs.readFileSync(
    path.resolve(__dirname, '..', 'style', 'index.html'),
    'utf-8',
  );

  if (!html.includes('<!-- VITE_ENTRY -->')) {
    throw new Error('Vite entry point not exists');
  }
  html =
    `<!-- This FILE is auto generated -->\n` +
    html
      .split('<!-- VITE_ENTRY -->')
      .join('<script type="module" src="/src/index.js"></script>');

  html = html.split('<%= htmlWebpackPlugin.options.sentry %>').join('');
  html = html
    .split('<%= htmlWebpackPlugin.options.bangleHelpPreload %>')
    .join('');

  fs.writeFileSync(path.resolve(__dirname, 'index.html'), html, 'utf-8');
  return {
    // plugins: [reactRefresh()],
    build: {
      target: 'es2018',
      sourcemap: isProduction ? false : true,
    },
    define: {
      ...envVars({ isProduction: mode === 'production' }).appEnvs,
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
};

export default config;
