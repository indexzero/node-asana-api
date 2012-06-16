
var asana = require('../lib/asana-api');

exports.createClient = function () {
  return asana.createClient({
    apiKey: exports.loadConfig().apiKey
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