/*
 * projects-test.js: Tests for the project resources of the Asana API.
 *
 * (C) 2012 Charlie Robbins
 *
 */

var vows = require('vows'),
    assert = require('./assert'),
    helpers = require('./helpers');

var config = helpers.loadConfig();

vows.describe('asana-api/projects').addBatch({
  "When using an instance of asana.Client": {
    topic: helpers.createClient(),
    "the projects.list() method": {
      topic: function (client) {
        client.projects.list(this.callback);
      },
      "should respond with a list of projects": function (err, projects) {
        assert.isNull(err);
        assert.isArray(projects);
        assert.hasNameAndId(projects);
      }
    },
    "the projects.tasks() method": {
      topic: function (client) {
        if (!config.projects || !config.projects[0]) {
          return this.callback(new Error('No projects configured in test/config.json'));
        }

        client.projects.tasks(config.projects[0], this.callback);
      },
      "should respond with valid tasks": function (err, tasks) {
        assert.isNull(err);
        assert.isArray(tasks);
        assert.hasNameAndId(tasks);
      }
    }
  }
}).export(module);
