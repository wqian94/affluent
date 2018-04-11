const os = require('os');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

var address = null;
{
  const networks = os.networkInterfaces();
  for (var network in networks) {
    if (('lo' != network) && ('IPv4' == networks[network][0].family)) {
      address = networks[network][0].address;
      break;
    }
  }
}

module.exports = {
  entry: './app/javascripts/app.js',
  devServer: {
    host: address,
    port: 4444,
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'app.js'
  },
  plugins: [
    // Copy our app's index.html to the build folder.
    new CopyWebpackPlugin([
      { from: './app/index.html', to: "index.html" },
      { from: './app/stylesheets/style.css', to: "style.css" }
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
