
var asana = require('../lib/asana-api');

exports.createClient = function () {
  return exports.createClientFromOAuthRefresh() || exports.createClientFromToken() || exports.createClientFromAPIKey();
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
  if (!config.oauth) return null;
  return asana.createClient({
    token: config.oauth.accessToken
  });
};

exports.createClientFromOAuthAccessToken = function () {
  var config = exports.loadConfig();
  if (!config.oauth) return null;
  return asana.createClient({
    oauth: {
      accessToken: config.oauth.accessToken
    }
  });
};

exports.createClientFromOAuthRefresh = function () {
  var config = exports.loadConfig();
  if (!config.oauth) return null;
  return asana.createClient({
    oauth: {
      accessToken : "old-expired-token",
      refreshToken : config.oauth.refreshToken,
      clientId : config.oauth.clientId,
      clientSecret : config.oauth.clientSecret,
      redirectUrl : config.oauth.redirectUrl
    }
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
