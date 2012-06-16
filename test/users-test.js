/*
 * users-test.js: Tests for the user resources of the Asana API.
 *
 * (C) 2012 Charlie Robbins
 *
 */
 
var vows = require('vows'),
    asana = require('../lib/asana-api');

vows.describe('asana-api/users').addBatch({
  "When using an instance of asana.Client": {
    topic: asana.createClient(require('./config.json')),
    "the me() method": {
      topic: function (client) {
        client.me(this.callback);
      },
      "should respond with the current user": function (_, user) {
        console.dir(user);
      }
    }
  }
}).export(module);