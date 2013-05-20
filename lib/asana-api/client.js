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
  
  //
  // If a token is provided, use oauth and accessToken instead of API key
  //
  if (options.token) {
    this.token = options.token;
    this.auth = 'Bearer ' + options.token;
  } else { 
    //
    // revert to API Key method
    //
    this.apiKey = options.apiKey;
    this.auth = 'Basic ' + base64.encode([options.apiKey, ''].join(':'));
  }

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
  options.uri     = this.url + options.path;
  options.proxy   = options.proxy;
  options.headers = options.headers || {};
  options.headers['content-type'] = options.headers['content-type'] || 'application/json';
  options.headers['authorization'] = options.headers['authorization'] || this.auth;

  if (options.query) {
    options.uri += '?' + qs.stringify(options.query);
    delete options.query;
  }

  if (options.body) {
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
      return callback(errs.create({
        message: 'Asana Error (' + statusCode + '): ' + self.failCodes[statusCode],
        result: result,
        status: statusCode
      }));
    }

    callback(null, result.data);
  });
};
