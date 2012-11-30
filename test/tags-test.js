/*
 * tags-test.js: Tests for the tag resources of the Asana API.
 *
 * (C) 2012 Charlie Robbins
 *
 */

var vows = require('vows'),
    assert = require('./assert'),
    helpers = require('./helpers');

var config = helpers.loadConfig();

vows.describe('asana-api/tags').addBatch({
  "When using an instance of asana.Client": {
    topic: helpers.createClient(),
    "the tags.list() method": {
      topic: function (client) {
        client.tags.list(this.callback);
      },
      "should respond with a list of tags": function (err, tags) {
        assert.isNull(err);
        assert.isArray(tags);
        assert.hasNameAndId(tags);
      }
    },
    "the tags.get() method": {
      topic: function (client) {
        if (config.tags && config.tags[0])
          client.tags.get(config.tags[0], this.callback);
        else
          this.callback("no tag configured on config.json");
      },
      "should respond with a valid tag": function (err, tag) {
        assert.isNull(err);
        assert.isTag(tag);
      }
    },
    "the tags.tasks() method": {
      topic: function (client) {
        if (config.tags && config.tags[0])
          client.tags.tasks(config.tags[0], this.callback);
        else
          this.callback("no tags configured in config.json");
      },
      "should respond with valid tasks": function (err, tasks) {
        assert.isNull(err);
        assert.isArray(tasks);
        assert.hasNameAndId(tasks);
      }
    },
    "the tags.create() method": {
      topic: function(client) {
        client.tags.create(config.workspaces[0], {
          name: 'testing tag'
        }, this.callback);
      },
      "should respond with a valid tag": function(err, tag) {
        assert.isNull(err);
        assert.isTag(tag);
      }
    },
    "the tags.update() method": {
      topic: function(client) {
        if (config.tags && config.tags[0])
          client.tags.update(config.tags[0],{name: 'testing tag2'}, this.callback);
        else
          this.callback("no tags configured in config.json");
      },
      "should respond with a valid tag": function(err, tag) {
        assert.isNull(err);
        assert.deepEqual('testing tag2', tag.name);
        assert.isTag(tag);
      }
    }
  }
}).export(module);