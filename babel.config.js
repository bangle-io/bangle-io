/* eslint-disable no-process-env */
// babel.config.js

const DEBUG = true;

module.exports = (api, ...args) => {
  if (api.env('test')) {
    return {
      presets: [
        '@babel/preset-react',
        [
          '@babel/preset-env',
          {
            debug: DEBUG,
            targets: {
              node: 'current',
            },
          },
        ],
        '@babel/preset-typescript',
      ],
    };
  }

  let envOptions = { debug: DEBUG, targets: {} };

  // browserslist is not configured when running integration tests
  // envOptions.targets = 'last 2 chrome version';

  const config = {
    presets: [
      '@babel/preset-react',
      ['@babel/preset-env', envOptions],
      process.env.WEBPACK && '@babel/preset-typescript',
    ].filter(Boolean),
    plugins: [['@babel/plugin-proposal-class-properties', { loose: true }]],
  };

  if (DEBUG) {
    console.info(config);
  }
  return config;
};
