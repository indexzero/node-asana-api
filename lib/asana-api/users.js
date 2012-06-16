/*
 * users.js: Methods for the users resource.
 *
 * (C) 2012 Charlie Robbins.
 *
 */

var Users = exports.Users = function (client) {
  this.client = client;
};

Users.prototype.get = function (id, callback) {
  if (!callback && typeof id === 'function') {
    callback = id;
    id = null;
  }
  
  id = id || '';
  return this.client.request('/users/' + id, callback);
};

Users.prototype.me = function (callback) {
  return this.get('me', callback);
};

Users.prototype.list = function (callback) {
  return this.get(callback);
};