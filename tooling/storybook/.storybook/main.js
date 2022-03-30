const webpack = require('webpack');

module.exports = {
  stories: [
    '../stories/**/*.stories.mdx',
    '../stories/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: '@storybook/react',
  core: {
    builder: 'webpack5',
  },
  typescript: {
    check: false,
    checkOptions: {},
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => {
        console.log(prop.parent?.fileName);
        if (prop.parent) {
          if (!/node_modules/.test(prop.parent.fileName)) {
            return true;
          }
          if (!/\.yarn/.test(prop.parent.fileName)) {
            return true;
          }

          return false;
        }
        return true;
      },
    },
  },

  webpackFinal: (config) => {
    config.resolve.plugins = config.resolve.plugins || [];
    const envVars = require('@bangle.io/env-vars')({ isProduction: false });
    // config.resolve.plugins.push(new TsconfigPathsPlugin());

    // config.resolve.fallback = {
    //   stream: false,
    //   path: false,
    //   process: false,
    // };

    config.module.rules.push({
      test: /\.m?js/,
      resolve: {
        fullySpecified: false,
      },
    });

    config.plugins.push(
      new webpack.DefinePlugin({
        ...envVars.appEnvs,
      }),
    );

    // config.plugins.push(
    //   new ProvidePlugin({
    //     process: require.resolve('process/browser'),
    //   }),
    // );

    return config;
  },
};
