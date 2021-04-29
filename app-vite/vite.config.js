import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';

const PORT = 4000;

// https://vitejs.dev/config/
const config = ({ command, mode }) => ({
  plugins: [reactRefresh()],
  build: {
    target: 'es2020',
  },
  define: {
    'global': 'window',
    'process.env.NODE_ENV': JSON.stringify(
      mode === 'production' ? 'production' : 'development',
    ),
    'process.env.RELEASE_ID': JSON.stringify(''),
    'process.env.DEPLOY_ENV': JSON.stringify('local'),
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
});

export default config;
