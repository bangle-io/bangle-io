const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

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
    entry: './app/index.js',
    devtool: true ? 'source-map' : 'eval-source-map',
    resolve: {
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
    output: {
      filename: 'main.[contenthash].js',
      chunkFilename: '[name].bundle.[contenthash].js',
      path: buildPath,
      publicPath: '/',
    },

    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(
          isProduction ? 'production' : 'development',
        ),
      }),
      new CaseSensitivePathsPlugin(),
      new HtmlWebpackPlugin({
        title: 'Bangle',
        template: 'style/index.html',
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
      new webpack.SourceMapDevToolPlugin({
        noSources: true,
      }),
      // new BundleAnalyzerPlugin(),
    ],
    module: {
      rules: [
        {
          test: /\.(png|svg|jpg|gif)$/,
          use: ['file-loader'],
        },
        {
          test: /\.js$/,
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
