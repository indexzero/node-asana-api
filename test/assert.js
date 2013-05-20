
var assert = module.exports = require('assert');

assert.isClient = function (client) {
  assert.isObject(client);
  !client.apiKey || assert.match(client.auth, /^Basic .+$/);
  !client.token || assert.match(client.auth, /^Bearer .+$/);
}

assert.isUser = function (user) {
  assert.isObject(user);
  assert.include(user, 'id');
  assert.include(user, 'name');
  assert.include(user, 'email');
  assert.isArray(user.workspaces);
};

assert.hasNameAndId = function (obj) {
  if (Array.isArray(obj)) {
    return obj.forEach(function (item) {
      assert.hasNameAndId(item);
    });
  }

  assert.isObject(obj);
  assert.include(obj, 'id');
  assert.include(obj, 'name');
};

assert.isTask = function (task) {
  assert.isNumber(task.id);
  assert.isArray(task.tags);
  assert.isString(task.created_at);
  assert.isString(task.modified_at);
  assert.isString(task.name);
  assert.isString(task.notes);
  assert.isBoolean(task.completed);
  assert.isString(task.assignee_status);
  assert.isArray(task.projects);
  assert.isObject(task.workspace);
  assert.isArray(task.followers);
  !task.due_on || assert.isString(task.due_on)
};

assert.isTag = function (tag) {
  assert.isNumber(tag.id);
  assert.isString(tag.name);
  assert.isString(tag.notes);
  assert.isString(tag.created_at);
  assert.isArray(tag.followers);
  assert.isObject(tag.workspace);
};
