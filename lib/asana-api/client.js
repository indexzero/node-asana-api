/*
 * client.js: Client for the RESTful provisioner service.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var events = require('events'),
    qs = require('querystring'),
    errs = require('errs'),
    utile = require('utile'),
    request = require('request'),
    base64 = utile.base64;

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

  events.EventEmitter.call(this);

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

  this.auth = function() {
    return self.oauth ? 'Bearer ' + self.oauth.accessToken : 'Basic ' + base64.encode([self.apiKey, ''].join(':'));
  };

  this.proxy = options.proxy;

  Object.keys(resources).forEach(function (name) {
    self[name.toLowerCase()] = new (resources[name])(self);
  });
};

//
// Inherit from `events.EventEmitter`
//
utile.inherits(Client, events.EventEmitter);

// Failure HTTP Response codes based
// off of `/lib/conservatory/provisioner/service.js`
Client.prototype.failCodes = {
  400: 'Bad Request',
  401: 'Not authorized',
  403: 'Forbidden',
  404: 'Item not found',
  500: 'Internal Server Error'
};

// Success HTTP Response codes based
// off of `/lib/conservatory/provisioner/service.js`
Client.prototype.successCodes = {
  200: 'OK',
  201: 'Created'
};

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
  options.uri     = options.uri || this.url + options.path;
  options.proxy   = options.proxy;
  options.headers = options.headers || {};
  options.headers['content-type'] = options.headers['content-type'] || 'application/json';
  options.headers['authorization'] = options.headers['authorization'] || self.auth();

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
    if (err) {
      return callback(err);
    }

    var statusCode = response.statusCode.toString(),
        result,
        error;

    try {
      result = JSON.parse(body);
    }
    catch (ex) {
      // Ignore Errors
    }

    if (Object.keys(self.failCodes).indexOf(statusCode) !== -1) {

      //
      // The 1st 401 might be an expired token, attempt refresh if we have a token
      //

      if(statusCode === '401' && self.oauth.refreshToken && !self.refreshAttempted) {

        var opts = {};

        refreshBody = {
          form: {
            client_id: self.oauth.clientId,
            client_secret: self.oauth.clientSecret,
            redirect_uri: self.oauth.redirectUrl,
            grant_type: 'refresh_token',
            refresh_token: self.oauth.refreshToken
          }
        };

        request.post(self.oauthUrl, refreshBody, function (err, response, body) {
          
          if(response.body && response.body.error) {
            callback(errs.create({
              message: 'Asana OAuth Refresh Error (' + response.statusCode.toString() + '): ' + response.body.error_description,
              status: response.statusCode.toString()
            }));
          } else {
            //
            // Set the new accessToken, update the headers and try again
            //
            self.oauth.accessToken = JSON.parse(response.body)['access_token'];
            options.headers['authorization'] = self.auth();

            self.request(options, callback);
          }

        });

        //
        // Only try it once
        //
        self.refreshAttempted = true;
        
      } else {

        return callback(errs.create({
          message: 'Asana Error (' + statusCode + '): ' + self.failCodes[statusCode],
          result: result,
          status: statusCode
        }));

      }
    } else {

      callback(null, result.data);

    }
  });
};
