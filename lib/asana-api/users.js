/*
 * users.js: Methods for the users resource.
 *
 * (C) 2012 Charlie Robbins.
 *
 */
 
exports.getUser = function (id, callback) {
  if (!callback && typeof id === 'function') {
    callback = id;
    id = null;
  }
  
  id = id || '';
  this.request('/users/' + id, callback, function (res, result) {
    callback(null, result.data);
  });
};

exports.me = function (callback) {
  this.getUser('me', callback);
};

exports.listUsers = function (callback) {
  this.getUser(callback);
};