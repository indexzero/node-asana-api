/*
 * users.js: Methods for the users resource.
 *
 * (C) 2012 Charlie Robbins.
 *
 */

var async = require('async');

var Users = exports.Users = function (client) {
  this.client = client;
};

Users.prototype.get = function (id, callback) {
  if (!callback && typeof id === 'function') {
    callback = id;
    id = null;
  }

  return this.client.request('/users/' + (id || ''), callback);
};

Users.prototype.tasks = function (id, callback) {
  var self = this;

  this.client.workspaces.list(function (err, workspaces) {
    if (err) {
      return callback(err);
    }

    //
    // Helper function for getting all tasks
    // for the user with `id` and `workspace`.
    //
    function getTasksForWorkspace(workspace, next) {
      self.client.workspaces.tasks({
        workspace: workspace.id,
        assignee: id
      }, function (err, tasks) {
        if (err && err.result && err.result.errors
          && !/Not a user in workspace/.test(err.result.errors[0].message)) {
          next(err);
        }

        next(null, tasks || []);
      });
    }

    async.concat(workspaces, getTasksForWorkspace, callback);
  });
};

Users.prototype.me = function (callback) {
  return this.get('me', callback);
};

Users.prototype.list = function (callback) {
  return this.get(callback);
};
