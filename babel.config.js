// babel.config.js

const DEBUG = true;

module.exports = (api) => {
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

  return {
    presets: ['@babel/preset-react', ['@babel/preset-env', envOptions]],
    plugins: [['@babel/plugin-proposal-class-properties', { loose: true }]],
  };
};
