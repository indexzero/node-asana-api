/*
 * workspaces.js: Methods for the workspaces resource.
 *
 * (C) 2012 Charlie Robbins.
 *
 */

var Workspaces = exports.Workspaces = function (client) {
  this.client = client;
};

Workspaces.prototype.list = function (callback) {
  return this.client.request('/workspaces', callback);
}

Workspaces.prototype.tasks = function (options, callback) {
  return this.client.request({
    path: '/tasks',
    query: options
  }, callback);
};

// lists projects from a workspace
Workspaces.prototype.projects = function (id, callback) {
  return this.client.request('/workspaces/' + id + '/projects', callback);
};

// lists teams from a workspace
Workspaces.prototype.teams = function (id, callback) {
  return this.client.request('/organizations/' + id + '/teams', callback);
};
