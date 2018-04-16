const fs = require('fs');
const path = require('path');
const { GANACHE_LOCATION } = require('./util');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const config = JSON.parse(fs.readFileSync(GANACHE_LOCATION));

console.log(`Config read from ${GANACHE_LOCATION}: ` +
  `host(${config.server.hostname})`);

module.exports = {
  entry: './app/javascripts/app.js',
  devServer: {
    host: config.server.hostname,
    port: 4444,
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'app.js'
  },
  plugins: [
    // Copy our app's index.html to the build folder.
    new CopyWebpackPlugin([
      { from: './app/index.html', to: 'index.html' },
      { from: './app/stylesheets/style.css', to: 'style.css' }
    ])
  ],
  module: {
    rules: [
      {
       test: /\.css$/,
       use: [ 'style-loader', 'css-loader' ]
      }
    ],
    loaders: [
      { test: /\.json$/, use: 'json-loader' },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015'],
          plugins: ['transform-runtime']
        }
      }
    ]
  }
}
