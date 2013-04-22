
var asana = require('../lib/asana-api');

exports.createClient = function () {
  return exports.createClientFromToken() || exports.createClientFromAPIKey();
};

exports.createClientFromAPIKey = function () {
  var config = exports.loadConfig();
  if (!config.apiKey) return null;
  return asana.createClient({
    apiKey: config.apiKey
  });
};

exports.createClientFromToken = function () {
  var config = exports.loadConfig();
  if (!config.token) return null;
  return asana.createClient({
    token: config.token
  });
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