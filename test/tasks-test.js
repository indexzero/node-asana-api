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

vows.describe('asana-api/tasks').addBatch({
  "When using an instance of asana.Client": {
    topic: helpers.createClient(),
    "the tasks.get() method": {
      topic: function (client) {
        client.tasks.get(config.tasks[0], this.callback);
      },
      "should respond with a valid task": function (err, task) {
        assert.isNull(err);
        assert.isTask(task);
      }
    }
  }
}).export(module);