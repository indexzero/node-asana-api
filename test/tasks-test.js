/*
 * tasks-test.js: Tests for the task resources of the Asana API.
 *
 * (C) 2012 Charlie Robbins
 *
 */

var vows = require('vows'),
    assert = require('./assert'),
    helpers = require('./helpers');

var config = helpers.loadConfig();

vows.describe('asana-api/tasks').addBatch({
  "When using an instance of asana.Client": {
    topic: helpers.createClient(),
    "the tasks.get() method": {
      topic: function (client) {
        if (config.tasks && config.tasks[0])
          client.tasks.get(config.tasks[0], this.callback);
        else
          this.callback("no task configured on config.json");
      },
      "should respond with a valid task": function (err, task) {
        assert.isNull(err);
        assert.isTask(task);
      }
    },
    "the tasks.create() method": {
      topic: function(client) {
        client.tasks.create(config.workspaces[0], config.projects[0], {
          name: 'testing name',
          notes: 'testing notes'
        }, this.callback);
      },
      "should respond with a valid task": function(err, task) {
        assert.isNull(err);
        assert.isTask(task);
      }
    }
  }
}).export(module);