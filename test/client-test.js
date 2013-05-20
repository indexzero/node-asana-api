/*
 * client-test.js: Tests for the client object of the Asana API.
 *
 * (C) 2013 Charlie Robbins
 *
 */
 
var vows = require('vows'),
    assert = require('./assert'),
    helpers = require('./helpers');
    
var config = helpers.loadConfig();

var clientVows = vows.describe('asana-api/client');

if (config.apiKey) {
  clientVows.addBatch({
    "When instantiating a new asana.Client": {
      "with an apiKey": {
        topic: function () {
          var client = helpers.createClientFromAPIKey();
          this.callback(null, client);
        },
        "a valid client should be returned": function (err, client) {
          assert.isNull(err);
          assert.isClient(client);
        }
      }
    }
  });
}

if (config.token) {
  clientVows.addBatch({
    "When instantiating a new asana.Client": {
      "with a token": {
        topic: function () {
          var client = helpers.createClientFromToken();
          this.callback(null, client);
        },
        "a valid client should be returned": function (err, client) {
          assert.isNull(err);
          assert.isClient(client);
        }
      }
    }
  });
}

clientVows.export(module);