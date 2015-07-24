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
var context = {};

vows.describe('asana-api/tags').addBatch({
  "When using an instance of asana.Client": {
    topic: helpers.createClient(),
    "the tags.create() method": {
      topic: function(client) {
        client.tags.create(config.workspaces[0], {
          name: 'testing tag'
        }, this.callback);
      },
      "should respond with a valid tag": function(err, tag) {
        assert.isNull(err);
        assert.isTag(tag);
        context.tag = tag;
      }
    },
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
  }
}).addBatch({
  "When using an instance of asana.Client": {
    topic: helpers.createClient(),
    "the tags.get() method": {
      topic: function (client) {
        client.tags.get(context.tag.id, this.callback);
      },
      "should respond with a valid tag": function (err, tag) {
        assert.isNull(err);
        assert.isTag(tag);
      }
    },
    "the tags.tasks() method": {
      topic: function (client) {
        client.tags.tasks(context.tag.id, this.callback);
      },
      "should respond with valid tasks": function (err, tasks) {
        assert.isNull(err);
        assert.isArray(tasks);
        assert.hasNameAndId(tasks);
      }
    },
    "the tags.update() method": {
      topic: function(client) {
        client.tags.update(context.tag.id, { name: 'testing tag2' }, this.callback);
      },
      "should respond with a valid tag": function(err, tag) {
        assert.isNull(err);
        assert.deepEqual('testing tag2', tag.name);
        assert.isTag(tag);
      }
    }
  }
}).export(module);
