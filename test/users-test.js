/*
 * users-test.js: Tests for the user resources of the Asana API.
 *
 * (C) 2012 Charlie Robbins
 *
 */

var vows = require('vows'),
    assert = require('./assert'),
    helpers = require('./helpers');

var config = helpers.loadConfig();

vows.describe('asana-api/users').addBatch({
  "When using an instance of asana.Client": {
    topic: helpers.createClient(),
    "the users.me() method": {
      topic: function (client) {
        client.users.me(this.callback);
      },
      "should respond with a valid user": function (err, user) {
        assert.isNull(err);
        assert.isUser(user);
      }
    },
    "the users.list() method": {
      topic: function (client) {
        client.users.list(this.callback);
      },
      "should respond with a list of users": function (err, users) {
        assert.isNull(err);
        assert.isArray(users);
      }
    },
    "the users.get() method": {
      topic: function (client) {
        client.users.get(config.users[0], this.callback);
      },
      "should respond with a valid user": function (err, user) {
        assert.isNull(err);
        assert.isUser(user);
      }
    },
    // "the users.tasks() method": {
    //   topic: function (client) {
    //     client.users.tasks(config.users[0], this.callback);
    //   },
    //   "should respond with a list of tasks": function (err, tasks) {
    //     assert.isNull(err);
    //     assert.isArray(tasks);
    //     assert.hasNameAndId(tasks);
    //   }

    // }
  }
}).export(module);
