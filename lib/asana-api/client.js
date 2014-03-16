/*
 * client.js: Client for the RESTful provisioner service.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var qs = require('querystring'),
    errs = require('errs'),
    util = require('util'),
    request = require('request'),
    http = require('http');

var resources = {
  Projects:   require('./projects').Projects,
  Stories:    require('./stories').Stories,
  Tasks:      require('./tasks').Tasks,
  Users:      require('./users').Users,
  Workspaces: require('./workspaces').Workspaces,
  Tags:       require('./tags').Tags
};

//
// ### function Client (options)
// #### @options {Object} Options to use for this instance.
// Constructor function for the Client to the Nodejitsu provisioner server.
//
var Client = exports.Client = function (options) {
  var self = this;

  this.url = 'https://app.asana.com/api/1.0';
  this.oauthUrl = 'https://app.asana.com/-/oauth_token';

  //
  // For backwards compatability, convert the options.token to options.oauth.accessToken
  //
  if(options.token) {
    options.oauth = options.oauth || {};
    options.oauth.accessToken = options.token;
  }

  //
  // If oauth is provided, use oauth tokens instead of API key
  //
  if (options.oauth) {
    this.oauth = options.oauth;
  } else {
    //
    // revert to API Key method
    //
    this.apiKey = options.apiKey;
  }

  this.authType = this.oauth ? 'Bearer' : 'Basic';
  this.proxy = options.proxy;

  Object.keys(resources).forEach(function (name) {
    self[name.toLowerCase()] = new (resources[name])(self);
  });
};

// Success HTTP Response codes
Client.prototype.successCodes = {
  200: 'Ok',
  201: 'Created',
  204: 'Not modified'
};

//
// ### @authHeader {string}
// Value for the HTTP authorization header for this instance.
//
Object.defineProperty(Client.prototype, 'authHeader', {
  enumerable: true,
  get: function () {
    if (!this._authHeader) {
      this.authToken = (this.oauth && this.oauth.accessToken)
        || new Buffer([this.apiKey, ''].join(':')).toString('base64');
      this._authHeader = [this.authType, this.authToken].join(' ');
    }

    return this._authHeader;
  }
});

//
// ### @private _request (options, callback)
// #### @options {Object|string} Outgoing request options.
// #### @callback {function} Continuation to respond to when complete.
// Core method for making requests against the Asana API.
//
Client.prototype.request = function (options, callback) {
  var self = this;

  if (typeof options === 'string') {
    options = { path: options };
  }

  options.method  = options.method || 'GET';
  options.uri     = (options.uri || this.url) + options.path;
  options.proxy   = options.proxy;
  options.headers = options.headers || {};
  options.headers['content-type'] = options.headers['content-type'] || 'application/json';
  options.headers['authorization'] = options.headers['authorization'] || this.authHeader;

  if (options.query) {
    options.uri += '?' + qs.stringify(options.query);
    delete options.query;
  }

  if (options.body && typeof(options.body) !== 'string') {
    if (options.headers['content-type'] === 'application/json') {
      options.body = JSON.stringify(options.body);
    } else {
      options.body = qs.stringify(options.body);
    }
  }

  return request(options, function (err, response, body) {

        if (err) { return callback(err); }

    var statusCode = response.statusCode,
        result;

    try { result = JSON.parse(body); }
    catch (error) {
      result = error;
    }

    if (!self.successCodes[statusCode]) {
      //
      // The 1st 401 might be an expired token, attempt refresh if we have a token
      //
      if (statusCode == 401 && self.oauth.refreshToken && !self.refreshAttempted) {
        //
        // Only try it once
        //
        self.refreshAttempted = true;
        return self.refreshToken(function (err) {
          return !err
            ? self.request(options, callback)
            : callback(err);
        });
      }

      return callback(errs.create({
        message: 'Asana Error (' + statusCode + '): ' + http.STATUS_CODES[statusCode],
        result: result,
        status: statusCode
      }));
    }

    callback(null, result.data);
  });
};

//
// ### function refreshOAuthToken (callback)
// Attempts to refresh the OAuth token associated
// with this Client instance.
//
Client.prototype.refreshToken = function (callback) {
  var self = this;
  var refreshOpts = {
    uri: this.oauthUrl,
    form: {
      client_id: this.oauth.clientId,
      client_secret: this.oauth.clientSecret,
      redirect_uri: this.oauth.redirectUrl,
      grant_type: 'refresh_token',
      refresh_token: this.oauth.refreshToken
    }
  };

  request.post(refreshOpts, function (err, res, body) {
    if (err || (body && body.error)) {
      return callback(errs.create({
        message: 'Asana OAuth Refresh Error (' + res.statusCode + '): ' + body.error_description,
        status: res.statusCode
      }));
    }

    //
    // Set the new accessToken, update the headers and try again
    //
    self.oauth.accessToken = JSON.parse(res.body)['access_token'];
    self._authHeader = null;
    options.headers['authorization'] = self.authHeader;

    //
    // Reset our refresh attempts since it may expire
    // again in the future.
    //
    self.refreshAttempted = false;
    callback();
  });
};
