/* eslint-disable no-process-env */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const ejs = require('ejs');
const fs = require('fs');

process.env.WEBPACK = true;

module.exports = (env, argv) => {
  const isProduction = env && env.production;
  const envVars = require('@bangle.io/env-vars')({ isProduction });

  const mode = isProduction ? 'production' : 'development';
  const buildPath = path.resolve(__dirname, 'build');
  // eslint-disable-next-line no-process-env
  if (isProduction && process.env.NODE_ENV !== 'production') {
    throw new Error('NODE_ENV not production');
  }

  let rawHtml = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
  const html = ejs.render(rawHtml, {
    ...envVars.htmlInjections,
  });

  console.log(`
  ====================${mode}========================
  `);
  const result = {
    target: 'web',
    mode,
    entry: './app/app-entry/index.ts',
    devtool: 'source-map',
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '...'],
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
        ...envVars.appEnvs,
      }),
      new CaseSensitivePathsPlugin(),
      new HtmlWebpackPlugin({
        title: 'Bangle',
        templateContent: html,
      }),
      new MiniCssExtractPlugin({
        filename: '[name].[contenthash].css',
        chunkFilename: '[id].[contenthash].css',
        ignoreOrder: false,
      }),
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'tooling', 'public'),
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
          test: /\.m?js/,
          resolve: {
            fullySpecified: false,
          },
        },
        // {
        //   test: /\.tsx?$/,
        //   use: 'ts-loader',
        //   exclude: /node_modules/,
        // },
        {
          test: /\.ejs$/,
          loader: 'ejs-loader',
          options: {
            variable: 'data',
          },
        },
        {
          test: /\.(png|svg|jpg|gif)$/,
          use: ['file-loader'],
        },
        {
          test: /\.(js|jsx|ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
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
        {
          test: /\.worker\.(c|m)?ts$/i,
          loader: 'worker-loader',
          // options: {
          //   worker: 'Worker',
          // },
        },
      ],
    },
  };

  if (process.env.NETLIFY) {
    delete result['devtool'];
  }

  return result;
};
