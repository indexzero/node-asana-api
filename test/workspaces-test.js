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
    //
    // TODO: Make this test pass again by creating a specific
    // task for this workspace and user.
    //
    // "the workspaces.tasks() method": {
    //   topic: function (client) {
    //     client.workspaces.tasks({
    //       workspace: config.workspaces[0],
    //       assignee: config.users[0]
    //     }, this.callback);
    //   },
    //   "should respond with valid tasks": function (err, tasks) {
    //     assert.isNull(err);
    //     assert.isArray(tasks);
    //   }
    // },
    "the workspaces.projects() method": {
      topic: function (client) {
        client.workspaces.projects(config.workspaces[0], this.callback);
      },
      "should respond with the projects in this workspace": function (err, projects) {
        assert.isNull(err);
        assert.isArray(projects);
      }
    },
    //
    // TODO: Make this test pass again by creating a valid organization before the test.
    // current error:
    //
    //   { message: 'Provided organization parameter is not a valid Organization. ' +
    //       'You provided a regular workspace. Check out' +
    //       'https://asana.com/developers/api-reference/workspaces' +
    //       'for the difference between workspaces and organizations.' }
    //
    // "the workspaces.teams() method": {
    //   topic: function (client) {
    //     client.workspaces.teams(config.workspaces[0], this.callback);
    //   },
    //   "should respond with the team records that match the given workspace": function (err, teams) {
    //     assert.isNull(err);
    //     assert.isArray(teams);
    //   }
    // }
  }
}).export(module);
