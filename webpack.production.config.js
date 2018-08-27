const path = require('path');
const config = require('./webpack.config.js');

config.mode = 'production';
config.output.filename = 'bundle.min.js';
config.resolve.alias['app-performance-timer'] = path.resolve(__dirname, 'js_src/shared/timer-dummy.js');

module.exports = config;