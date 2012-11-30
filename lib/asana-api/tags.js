/*
 * tags.js: Methods for the tags resource.
 *
 * (C) 2012 Charlie Robbins.
 *
 */

var Tags = exports.Tags = function (client) {
  this.client = client;
};

Tags.prototype.list = function (callback) {
  return this.client.request('/tags', callback);
};


Tags.prototype.get = function (tag, callback) {
  return this.client.request('/tags/' + tag, callback, function (res, result) {
    callback(null, result.data);
  });
};

Tags.prototype.tasks = function (tag, callback) {
  return this.client.request('/tags/' + tag + '/tasks', callback, function (res, result) {
    callback(null, result.data);
  });
};

// expects tagData to contain
// name
// as per
// http://developer.asana.com/documentation/#tags
Tags.prototype.create = function(workspaceId, tagData, callback) {
  tagData.workspace = workspaceId;

  var options = {
    method: "POST",
    path: "/tags",
    body: {data: tagData},
  };

  var self = this;
  return this.client.request(options, function(res, result) {
    if (!result)
      return callback(res.result.errors);
    callback(null, result);
  });
};

Tags.prototype.update = function(tag,tagData,callback) {
  var options = {
    method: "PUT",
    path: '/tags/' + tag,
    body: {data: tagData},
  };
  var self = this;
  return this.client.request(options, function(res, result) {
    if (!result)
      return callback(res.result.errors);
    callback(null, result);
  });
};