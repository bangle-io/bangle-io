/* eslint-disable no-process-env */
import reactRefresh from '@vitejs/plugin-react-refresh';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
let commitHash = execSync('git rev-parse --short HEAD').toString();

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

  fs.writeFileSync(path.resolve(__dirname, 'index.html'), html, 'utf-8');
  return {
    plugins: [reactRefresh()],
    build: {
      target: 'es2020',
      sourcemap: isProduction ? false : true,
    },
    define: {
      'global': 'window',
      'process.env.NODE_ENV': JSON.stringify(
        mode === 'production' ? 'production' : 'development',
      ),
      'process.env.RELEASE_ID': JSON.stringify(
        process.env.NETLIFY
          ? `${process.env.CONTEXT}@` + process.env.COMMIT_REF
          : 'local@' + commitHash,
      ),
      'process.env.DEPLOY_ENV': JSON.stringify(
        process.env.NETLIFY ? process.env.CONTEXT : 'local',
      ),
    },
    server: {
      port: PORT,
      strictPort: true,
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
