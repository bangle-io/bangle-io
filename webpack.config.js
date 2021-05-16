/* eslint-disable no-process-env */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

let commitHash = require('child_process')
  .execSync('git rev-parse --short HEAD')
  .toString();

module.exports = (env, argv) => {
  const isProduction = env && env.production;
  const mode = isProduction ? 'production' : 'development';
  const buildPath = path.resolve(__dirname, 'build');
  // eslint-disable-next-line no-process-env
  if (isProduction && process.env.NODE_ENV !== 'production') {
    throw new Error('NODE_ENV not production');
  }
  console.log(`
  ====================${mode}========================
  `);
  return {
    target: 'web',
    mode,
    entry: './app/index.jsx',
    devtool: true ? 'source-map' : 'eval-source-map',
    resolve: {
      extensions: ['.jsx', '.js', '...'],
      // TODO fix me punycode
      fallback: { punycode: require.resolve('punycode/') },
    },
    resolveLoader: {},
    devServer: {
      contentBase: path.join(__dirname, 'build'),
      disableHostCheck: true,
      port: 4000,
      host: '0.0.0.0',
      historyApiFallback: {
        disableDotRule: true,
      },
    },
    optimization: {
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/](prosemirror-[a-z]*|markdown-it|markdown-it-emoji|entities|linkify-it|react|react-dom|react-router|history|@popperjs)[\\/]/,
            name: 'vendor',
            chunks: 'all',
          },
          bangledev: {
            test: /[\\/]node_modules[\\/](@bangle.dev)[\\/]/,
            name: 'bangledev',
            chunks: 'all',
          },
        },
      },
    },
    output: {
      filename: '[name].[contenthash].js',
      chunkFilename: '[name].bundle.[contenthash].js',
      path: buildPath,
      publicPath: '/',
    },

    plugins: [
      new webpack.DefinePlugin({
        ...require('env-vars')({ isProduction }).appEnvs,
      }),
      new CaseSensitivePathsPlugin(),
      new HtmlWebpackPlugin({
        title: 'Bangle',
        template: 'style/index.html',
        sentry: isProduction
          ? `<script
          src="https://js.sentry-cdn.com/f1a3d53e530e465e8f74f847370b594b.min.js"
          crossorigin="anonymous"
          data-lazy="no"
        ></script>`
          : '',
      }),
      new MiniCssExtractPlugin({
        filename: '[name].[contenthash].css',
        chunkFilename: '[id].[contenthash].css',
        ignoreOrder: false,
      }),
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'webpack', 'static'),
            to: buildPath,
          },
        ],
      }),
      // eslint-disable-next-line no-process-env
      process.env.NETLIFY
        ? new webpack.SourceMapDevToolPlugin({
            noSources: true,
          })
        : null,
      // new BundleAnalyzerPlugin(),
    ].filter(Boolean),
    module: {
      rules: [
        {
          test: /\.(png|svg|jpg|gif)$/,
          use: ['file-loader'],
        },
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: require.resolve('babel-loader'),
          },
        },

        {
          test: /\.css$/i,
          use: [
            // 'style-loader',
            {
              loader: MiniCssExtractPlugin.loader,
              options: {},
            },
            {
              loader: 'css-loader',
              options: { importLoaders: 1, sourceMap: true },
            },

            {
              loader: 'postcss-loader',
            },
          ],
        },
      ],
    },
  };
};
