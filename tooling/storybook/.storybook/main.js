const webpack = require('webpack');
const UnoCSS = require('@unocss/webpack').default;

const {
  ALL_TOP_LEVEL_DIRS,
} = require('@bangle.io/yarn-workspace-helpers/constants');

module.exports = {
  stories: [
    ...ALL_TOP_LEVEL_DIRS.map(
      (dir) => `../../../${dir}/**/*.stories.@(js|jsx|ts|tsx)`,
    ),
  ],
  features: {
    babelModeV7: true,
  },

  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    {
      name: '@storybook/addon-postcss',
      options: {
        postcssLoaderOptions: {
          implementation: require('postcss'),
        },
      },
    },
  ],

  framework: '@storybook/react',
  reactOptions: {
    fastRefresh: true,
  },
  core: {
    builder: 'webpack5',
  },
  babel: (options) => {
    return {
      ...options,
      presets: [
        ...options.presets,
        [
          require.resolve('@babel/preset-env'),
          {
            targets: 'last 2 chrome version',
          },
        ],
        require.resolve('@babel/preset-typescript'),
      ],
    };
  },
  typescript: {
    check: false,
    checkOptions: {},
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => {
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
    const envVars = require('@bangle.io/env-vars')({
      isProduction: false,
      isStorybook: true,
    });

    config.optimization.realContentHash = true;

    config.module.rules.push({
      test: /\.m?js/,
      resolve: {
        fullySpecified: false,
      },
    });
    config.plugins.push(UnoCSS());
    config.plugins.push(
      new webpack.DefinePlugin({
        ...envVars.appEnvs,
      }),
    );

    return config;
  },
};
