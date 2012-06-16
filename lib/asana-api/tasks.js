/*
 * tasks.js: Methods for the tasks resource.
 *
 * (C) 2012 Charlie Robbins.
 *
 */

var Tasks = exports.Tasks = function (client) {
  this.client = client;
};

Tasks.prototype.get = function (task, callback) {
  return this.client.request('/tasks/' + task, callback, function (res, result) {
    callback(null, result.data);
  });
};