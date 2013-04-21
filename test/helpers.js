
var asana = require('../lib/asana-api');

exports.createClient = function () {

  var config = exports.loadConfig();
  var options = {};

  if (config.token) {
    options.token = config.token;
  } else {
    options.apiKey = token.apiKey;
  }

  return asana.createClient(options);
};

exports.loadConfig = function () {
  try {
    return require('./config.json');
  }
  catch (ex) {
    console.log('Error loading test/config.json');
    console.log('Have you created it yet?');
    console.log(err.message);
    process.exit(1);
  }
}