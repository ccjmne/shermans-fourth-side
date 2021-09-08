import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import HtmlWebpackPlugin, { MinifyOptions } from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
// import svgToMiniDataURI from 'mini-svg-data-uri';
import { resolve } from 'path';
import { Configuration, EntryObject } from 'webpack';
import { Configuration as DevServerConfiguration } from 'webpack-dev-server';
import { author, description, keywords, name } from './package.json';

const HTML_MINIFY_OPTS: MinifyOptions = {
  removeComments: true,
  collapseWhitespace: true,
  conservativeCollapse: true,
  removeAttributeQuotes: true,
  useShortDoctype: true,
  keepClosingSlash: true,
  minifyJS: true,
  minifyCSS: true,
  removeScriptTypeAttributes: true,
};

const src = resolve(__dirname, 'src');
const dist = resolve(__dirname, 'dist');
export default (
  _env: string,
  { mode }: { mode?: 'production' | 'development' } = { mode: 'production' },
): Configuration & { devServer: DevServerConfiguration } => ({
  entry: {
    // scss: resolve(src, 'index.scss'),
    main: resolve(src, 'index.ts'),
  },
  output: {
    path: dist,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }, {
        test: /exported-vars\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: { modules: { compileType: 'icss' } },
          },
          'sass-loader',
        ],
      }, {
        test: /(?<!exported-vars)\.scss?$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
        exclude: /node_modules/,
      }, {
        test: /\.html$/,
        use: [{
          loader: 'html-loader',
          options: {
            esModule: false,
            sources: {
              list: [
                { tag: 'img', attribute: 'src', type: 'src' },
                { tag: 'img', attribute: 'data-src', type: 'src' },
                { tag: 'video', attribute: 'src', type: 'src' },
                { tag: 'video', attribute: 'data-src', type: 'src' },
              ],
            },
            minimize: mode === 'production' && HTML_MINIFY_OPTS,
          },
        }],
      },
    ],
    // }, {
    //   test: /\.svg$/,
    //   // see https://webpack.js.org/guides/asset-modules/
    //   type: 'asset/inline',
    //   generator: { dataUrl: (content: unknown) => svgToMiniDataURI(content.toString()) },
    // } as unknown], // TODO: remove 'as unknown' as soon as typings are updated for `RuleSetRule`
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '...'],
    // IMPORTANT: prioritise "global" node modules, for extending modules (e.g.: d3-selection-multi enhances d3-selection)
    modules: [resolve(__dirname, 'node_modules'), 'node_modules'],
    mainFields: ['webpack', 'module', 'browser', 'web', 'browserify', ['jam', 'main'], 'main'],
  },
  plugins: [].concat(
    new MiniCssExtractPlugin({ filename: '[name].css', chunkFilename: '[id].css' }),
    mode === 'production' ? new CleanWebpackPlugin() : [],
    new HtmlWebpackPlugin({
      title: name,
      meta: { author, description, keywords: keywords.join(', ') },
      filename: resolve(dist, 'index.html'),
      minify: HTML_MINIFY_OPTS,
    }),
  ),
  devtool: mode === 'development' ? 'source-map' : false,
  devServer: {
    hot: true,
  },
  optimization: {
    runtimeChunk: mode === 'production' ? 'single' : { name: (entrypoint: EntryObject) => `runtime~${entrypoint.name}` },
  },
});
