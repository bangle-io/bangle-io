const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const InlineChunkHtmlPlugin = require('react-dev-utils/InlineChunkHtmlPlugin');
// const ZipPlugin = require("zip-webpack-plugin");
const CopyPlugin = require('copy-webpack-plugin');
const fs = require('fs');
const bangleManifest = JSON.parse(JSON.stringify(require('./bangle.manifest')));
const HTMLInlineCSSWebpackPlugin =
  require('html-inline-css-webpack-plugin').default;
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const dist = path.resolve(__dirname, 'dist');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  return {
    entry: {
      app: './src/index.ts',
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'dist'),
      publicPath: '/',
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
        {
          test: /\.(svg|png|bmp|jpg|jpeg|webp|gif)$/i,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 100000000,
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name].css',
        chunkFilename: '[id].css',
      }),
      new HtmlWebpackPlugin({
        inject: 'body',
        template: path.resolve(__dirname, 'src/index.html'),
        chunks: ['app'],
      }),
      isProd && new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/app/]),
      new HTMLInlineCSSWebpackPlugin(),
      // isProd &&
      //   new CopyPlugin({
      //     patterns: [{ from: "bangle.manifest.json" }, { from: "icon.png" }],
      //   }),
      //   isProd && new ZipPlugin({
      //     filename: manifestJson.fileName,
      //     extension: 'craftx',
      //     include: [
      //       'app.js.LICENSE.txt',
      //       'index.html',
      //       'manifest.json',
      //       'icon.png'
      //     ]
      //   })
    ].filter(Boolean),
  };
};

fs.mkdir(dist, { recursive: true }, (error) => {
  fs.writeFileSync(
    path.join(dist, 'bangle.manifest.json'),
    JSON.stringify(bangleManifest),
    'utf-8',
  );
});
