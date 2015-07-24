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
  return this.client.request('/tasks/' + task, function (err, task) {
    return !err ? callback(null, task) : callback(err);
  });
};

// expects taskData to contain
// name, notes, due_on, assignee, assignee_status
// as per
// http://developer.asana.com/documentation/#tasks
//
// projectId may be null, a single projectId, or an array of projectIds.
//
Tasks.prototype.create = function(workspaceId, projectId, taskData, callback) {
  taskData.workspace = workspaceId;

  var options = {
    method: "POST",
    path: "/tasks",
    body: {data: taskData},
  };

  var self = this;
  return this.client.request(options, function(err, task) {
    if (err) { return callback(err); }
    else if (!projectId) {
      // No project to add it to? that is a bit weird but ok
      return callback(null, task);
    }

    self.client.request({
      method: "POST",
      path: "/tasks/" + task.id + "/addProject",
      body: {data: {project: projectId}}
    }, function(err, result) {
      if (err || !result) {
        return callback(err || new Error('No data returned.'));
      }

      callback(null, task);
    });
  });
};

Tasks.prototype.edit = function(taskId, taskData, callback) {
  var options = {
    method: "PUT",
    path: "/tasks/" + taskId,
    body: {data: taskData},
  };

  return this.client.request(options, function (err, result) {
    return !err ? callback(null, result.data) : callback(err);
  });
};

// get stories from a task
Tasks.prototype.stories = function(taskId, callback) {
  var options = {
    method: "GET",
    path: "/tasks/" + taskId + "/stories"
  };

  return this.client.request(options, function (err, result) {
    return !err ? callback(null, result) : callback(err);
  });
};

// add a commment (story) to a task
Tasks.prototype.comment = function(taskId, comment, callback) {
  var options = {
    method: "POST",
    path: "/tasks/" + taskId + "/stories",
    body: {data : {text : comment} }
  };

  return this.client.request(options, function (err, result) {
    return !err ? callback(null, result) : callback(err);
  });
};

// delete a task
Tasks.prototype.remove = function(taskId, callback) {
  var options = {
    method: "DELETE",
    path: "/tasks/" + taskId
  };

  return this.client.request(options, function (err, result) {
    return !err ? callback(null, result) : callback(err);
  });
};


