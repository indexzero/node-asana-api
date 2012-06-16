/*
 * client.js: Client for the RESTful provisioner service.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var events = require('events'),
    errs = require('errs'),
    utile = require('utile'),
    request = require('request'),
    base64 = utile.base64;    

//
// ### function Client (options)
// #### @options {Object} Options to use for this instance.
// Constructor function for the Client to the Nodejitsu provisioner server.
//
var Client = exports.Client = function (options) {
  var self = this;
  
  events.EventEmitter.call(this);

  this.url = 'https://app.asana.com/api/1.0';
  this.apiKey = options.apiKey;
  this.auth = 'Basic ' + base64.encode([options.apiKey, ''].join(':'));
  
  ['projects', 'stories', 'tasks', 'users', 'workspaces'].forEach(function (key) {
    utile.mixin(self, require('./' + key));
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
// ### @private _request (method, uri, [body], callback, success)
// #### @options {Object} Outgoing request options.
// #### @callback {function} Continuation to short-circuit to if request is unsuccessful.
// #### @success {function} Continuation to call if the request is successful
// Core method for making requests against the haibu Drone API. Flexible with respect
// to continuation passing given success and callback.
//
Client.prototype.request = function (options, callback, success) {
  var self = this;
  
  if (typeof options === 'string') {
    options = { path: options };
  }
  
  options.method  = options.method || 'GET';
  options.uri     = this.url + options.path;
  options.headers = options.headers || {};
  options.headers['content-type'] = options.headers['content-type'] || 'application/json';
  options.headers['authorization'] = options.headers['authorization'] || this.auth;
  
  console.dir(this.auth);
  if (options.headers['content-type'] === 'application/json'
    && options.body) {
    options.body = JSON.stringify(options.body);
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

    success(response, result);
  });
};
