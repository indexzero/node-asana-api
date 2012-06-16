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