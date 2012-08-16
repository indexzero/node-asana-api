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

// expects taskData to contain
// name, notes, due_on, assignee, assignee_status
// as per
// http://developer.asana.com/documentation/#tasks
Tasks.prototype.create = function(workspaceId, projectId, taskData, callback) {
  taskData.workspace = workspaceId;

  var options = {
    method: "POST",
    path: "/tasks",
    body: {data: taskData},
  };

  var self = this;
  return this.client.request(options, function(res, result) {
    if (!result)
      return callback(res.result.errors);

    var task = result;

    self.client.request({
      method: "POST",
      path: "/tasks/" + result.id + "/addProject",
      body: {data: {project: projectId}}
    }, function(res, result) {
      if (!result)
        return callback(res.result.errors);

      callback(null, task);
    });
  });
};