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

var suite = vows.describe('asana-api/client');

if (config.apiKey) {
  suite.addBatch({
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

if (config.oauth) {
  suite.addBatch({
    "When instantiating a new asana.Client": {
      "with a token": {
        topic: function () {
          var client;

          try {
            client = helpers.createClientFromToken();
          } catch(e) {
            return this.callback(e);
          }

          this.callback(null, client);
        },
        "a valid client should be returned": function (err, client) {
          assert.isNull(err);
          assert.isClient(client);
        }
      },
      "with an OAuth accessToken": {
        topic: function () {
          var client;

          try {
            client = helpers.createClientFromOAuthAccessToken();
          } catch (e) {
            return this.callback(e);
          }

          this.callback(null, client);
        },
        "a valid client should be returned": function (err, client) {
          assert.isNull(err);
          assert.isClient(client);
        }
      },
      "with an expired accessToken and OAuth refresh" : {
        topic: function() {
          var client;

          try {
            client = helpers.createClientFromOAuthRefresh();
          } catch(e) {
            return this.callback(e);
          }

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

suite.export(module);
