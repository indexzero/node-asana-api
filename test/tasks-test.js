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
var context = {};

vows.describe('asana-api/tasks').addBatch({
  "When using an instance of asana.Client": {
    topic: helpers.createClient(),
    "the tasks.create() method": {
      "without a projectId": {
        topic: function(client) {
          client.tasks.create(config.workspaces[0], null, {
            name: 'testing name',
            notes: 'testing notes'
          }, this.callback);
        },
        "should respond with a valid task": function (err, task) {
          assert.isNull(err);
          assert.isTask(task);
        }
      },
      "with a projectId": {
        topic: function(client) {
          client.tasks.create(config.workspaces[0], config.projects[0], {
            name: 'testing name',
            notes: 'testing notes'
          }, this.callback);
        },
        "should respond with a valid task": function (err, task) {
          assert.isNull(err);
          assert.isTask(task);
          context.task = task;
        }
      }
    }
  }
}).addBatch({
  "When using an instance of asana.Client": {
    topic: helpers.createClient(),
    "the tasks.get() method": {
      topic: function (client) {
        client.tasks.get(context.task.id, this.callback);
      },
      "should respond with a valid task": function (err, task) {
        assert.isNull(err);
        assert.isTask(task);
      }
    },
  }
}).addBatch({
  "When using an instance of asana.Client": {
    topic: helpers.createClient(),
    "the tasks.stories() method": {
      topic: function(client) {
        client.tasks.stories(context.task.id, this.callback);
      },
      "should respond with stories from the task": function (err, stories) {
        assert.isNull(err);
        assert.isArray(stories);
      }
    },
    "the tasks.comment() method": {
      topic: function(client) {
        client.tasks.comment(context.task.id, "A new comment", this.callback);
      },
      "should respond with the comment data": function (err, comment) {
        assert.isNull(err);
        assert.isComment(comment);
      }
    }
  }
}).addBatch({
  "When using an instance of asana.Client": {
    topic: helpers.createClient(),
    "the tasks.remove() method": {
      topic: function(client) {
        client.tasks.remove(context.task.id, this.callback)
      },
      "should respond with empty task object": function (err, result) {
        assert.isNull(err);
        assert.deepEqual(result, {});
      }
    }
  }
}).export(module);
