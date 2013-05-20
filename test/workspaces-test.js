/*
 * workspaces-test.js: Tests for the workspace resources of the Asana API.
 *
 * (C) 2012 Charlie Robbins
 *
 */

var vows = require('vows'),
    assert = require('./assert'),
    helpers = require('./helpers');

var config = helpers.loadConfig();

vows.describe('asana-api/workspaces').addBatch({
  "When using an instance of asana.Client": {
    topic: helpers.createClient(),
    "the workspaces.list() method": {
      topic: function (client) {
        client.workspaces.list(this.callback);
      },
      "should respond with valid workspaces": function (err, workspaces) {
        assert.isNull(err);
        workspaces.forEach(function (workspace) {
          assert.hasNameAndId(workspace);
        });
      }
    },
    "the workspaces.tasks() method": {
      topic: function (client) {
        client.workspaces.tasks({
          workspace: config.workspaces[0],
          assignee: config.users[0]
        }, this.callback);
      },
      "should respond with valid tasks": function (err, tasks) {
        assert.isNull(err);
        assert.isArray(tasks);
      }
    }
  }
}).export(module);