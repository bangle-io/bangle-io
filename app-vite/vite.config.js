/* eslint-disable no-process-env */
import reactRefresh from '@vitejs/plugin-react-refresh';
import { execSync } from 'child_process';

let commitHash = execSync('git rev-parse --short HEAD').toString();

// https://vitejs.dev/config/
const config = ({ command, mode }) => {
  const isProduction = mode === 'production';
  const PORT = isProduction ? 5000 : 4000;
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
