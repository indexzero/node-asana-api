/*
 * projects.js: Methods for the projects resource.
 *
 * (C) 2012 Charlie Robbins.
 *
 */

var Projects = exports.Projects = function (client) {
  this.client = client;
};

Projects.prototype.list = function (callback) {
  return this.client.request('/projects', callback);
};

Projects.prototype.tasks = function (project, callback) {
  return this.client.request('/projects/' + project + '/tasks', callback);
};
