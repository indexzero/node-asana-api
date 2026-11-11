/*
 * characterization.test.cjs: Pins what asana-api puts on the wire and what it
 * hands back, against a local HTTP server.
 *
 * (C) 2012 Charlie Robbins
 *
 * This file loads the package with `require()` and uses callbacks, as every
 * 1.x caller does, so the same file runs against 1.0.0 and against the
 * rewrite. Where the two differ on purpose, the test branches on `LEGACY`
 * and says why. Nothing here talks to Asana.
 */

'use strict';

const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const { after, before, beforeEach, describe, it } = require('node:test');

const asana = require('..');

// 1.x is CommonJS. Everything after it declares itself an ES module.
const LEGACY = require('../package.json').type !== 'module';
const root = path.join(__dirname, '..');

/** Requests the server has seen since the last reset. */
let seen = [];
/** Chooses the response for a request: `(req) => [status, body]`. */
let respond = () => [200, { data: {} }];
let server;
let base;

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const entry = {
        method: req.method,
        url: req.url,
        authorization: req.headers.authorization,
        contentType: req.headers['content-type'],
        body
      };
      seen.push(entry);
      const [status, payload] = respond(entry);
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(typeof payload === 'string' ? payload : JSON.stringify(payload));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise(resolve => server.close(resolve)));

beforeEach(() => {
  seen = [];
  respond = () => [200, { data: {} }];
});

function client(options = { token: 'tok' }) {
  const instance = asana.createClient(options);
  instance.url = base;
  instance.oauthUrl = `${base}/-/oauth_token`;
  return instance;
}

/** Calls a callback-style method and resolves with `[err, result]`. */
function call(target, method, ...args) {
  return new Promise(resolve => {
    target[method](...args, (err, result) => resolve([err, result]));
  });
}

/** Runs a snippet in a child process, for behaviour that kills the process. */
function child(source) {
  return new Promise(resolve => {
    execFile(
      process.execPath,
      ['-e', source],
      { cwd: root, env: { ...process.env, ASANA_BASE: base } },
      (error, stdout, stderr) => resolve({ code: error ? error.code : 0, stdout, stderr })
    );
  });
}

describe('authorization', () => {
  it('sends a token as a Bearer header', async () => {
    await call(client({ token: 'tok' }).users, 'me');
    assert.equal(seen[0].authorization, 'Bearer tok');
  });

  it('sends oauth.accessToken as a Bearer header', async () => {
    await call(client({ oauth: { accessToken: 'abc' } }).users, 'me');
    assert.equal(seen[0].authorization, 'Bearer abc');
  });

  it('sends JSON by default', async () => {
    await call(client().users, 'me');
    assert.equal(seen[0].contentType, 'application/json');
  });

  if (LEGACY) {
    it('1.x: sends an API key as Basic auth', async () => {
      await call(client({ apiKey: 'key' }).users, 'me');
      assert.equal(seen[0].authorization, `Basic ${Buffer.from('key:').toString('base64')}`);
    });

    it('1.x: an API key client crashes the process on any error response', async () => {
      // Known defect. The 401 handler reads `self.oauth.refreshToken` when
      // there is no `oauth`, and the TypeError escapes the response callback.
      respond = () => [401, { errors: [{ message: 'Not Authorized' }] }];
      const result = await child(`
        const c = require('.').createClient({ apiKey: 'key' });
        c.url = process.env.ASANA_BASE;
        c.users.me(err => { console.log('CALLBACK', err && err.message); });
      `);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, /TypeError/);
      assert.doesNotMatch(result.stdout, /CALLBACK/);
    });
  } else {
    it('2.x: refuses an API key when the client is created', () => {
      // Asana retired API keys. Failing here is louder than a 401 later.
      assert.throws(() => asana.createClient({ apiKey: 'key' }), /apiKey.*token/s);
    });
  }
});

describe('requests', () => {
  const cases = [
    ['users.list', c => [c.users, 'list'], 'GET', '/users/'],
    ['users.me', c => [c.users, 'me'], 'GET', '/users/me'],
    ['users.get', c => [c.users, 'get', '42'], 'GET', '/users/42'],
    ['workspaces.list', c => [c.workspaces, 'list'], 'GET', '/workspaces'],
    ['workspaces.projects', c => [c.workspaces, 'projects', '7'], 'GET', '/workspaces/7/projects'],
    ['projects.list', c => [c.projects, 'list'], 'GET', '/projects'],
    ['projects.tasks', c => [c.projects, 'tasks', '9'], 'GET', '/projects/9/tasks'],
    ['tags.list', c => [c.tags, 'list'], 'GET', '/tags'],
    ['tags.get', c => [c.tags, 'get', '3'], 'GET', '/tags/3'],
    ['tags.tasks', c => [c.tags, 'tasks', '3'], 'GET', '/tags/3/tasks'],
    ['tasks.get', c => [c.tasks, 'get', '5'], 'GET', '/tasks/5'],
    ['tasks.stories', c => [c.tasks, 'stories', '5'], 'GET', '/tasks/5/stories'],
    ['tasks.remove', c => [c.tasks, 'remove', '5'], 'DELETE', '/tasks/5']
  ];

  for (const [name, build, method, url] of cases) {
    it(`${name} sends ${method} ${url}`, async () => {
      respond = () => [200, { data: { gid: '1', name: 'thing' } }];
      const [target, fn, ...args] = build(client());
      const [err, result] = await call(target, fn, ...args);
      assert.equal(err, null);
      assert.deepEqual(result, { gid: '1', name: 'thing' });
      assert.equal(seen.length, 1);
      assert.equal(seen[0].method, method);
      assert.equal(seen[0].url, url);
    });
  }

  it('workspaces.tasks sends its options as the query string', async () => {
    await call(client().workspaces, 'tasks', { workspace: '7', assignee: 'me' });
    assert.equal(seen[0].method, 'GET');
    assert.equal(seen[0].url, '/tasks?workspace=7&assignee=me');
  });

  it('workspaces.teams lists the teams of a workspace', async () => {
    await call(client().workspaces, 'teams', '7');
    // 1.x used a path the API no longer documents.
    assert.equal(seen[0].url, LEGACY ? '/organizations/7/teams' : '/workspaces/7/teams');
  });

  it('tags.create posts the tag with its workspace', async () => {
    await call(client().tags, 'create', '7', { name: 'urgent' });
    assert.equal(seen[0].method, 'POST');
    assert.equal(seen[0].url, '/tags');
    assert.deepEqual(JSON.parse(seen[0].body), { data: { name: 'urgent', workspace: '7' } });
  });

  it('tags.update puts the tag data', async () => {
    await call(client().tags, 'update', '3', { name: 'later' });
    assert.equal(seen[0].method, 'PUT');
    assert.equal(seen[0].url, '/tags/3');
    assert.deepEqual(JSON.parse(seen[0].body), { data: { name: 'later' } });
  });

  it('tasks.comment posts a story with the text', async () => {
    await call(client().tasks, 'comment', '5', 'hello');
    assert.equal(seen[0].method, 'POST');
    assert.equal(seen[0].url, '/tasks/5/stories');
    assert.deepEqual(JSON.parse(seen[0].body), { data: { text: 'hello' } });
  });

  it('tasks.create without a project makes one request', async () => {
    respond = () => [201, { data: { gid: '11', name: 't' } }];
    const [err, task] = await call(client().tasks, 'create', '7', null, { name: 't' });
    assert.equal(err, null);
    assert.equal(task.gid, '11');
    assert.equal(seen.length, 1);
    assert.equal(seen[0].url, '/tasks');
    assert.deepEqual(JSON.parse(seen[0].body), { data: { name: 't', workspace: '7' } });
  });

  it('tasks.create with a project then adds the task to it', async () => {
    // `id` is what the API returned in 2015. It returns only `gid` now.
    respond = entry =>
      entry.url === '/tasks' ? [201, { data: { id: 11, gid: '11' } }] : [200, { data: {} }];
    const [err, task] = await call(client().tasks, 'create', '7', '9', { name: 't' });
    assert.equal(err, null);
    assert.equal(task.gid, '11');
    assert.equal(seen[1].method, 'POST');
    assert.equal(seen[1].url, '/tasks/11/addProject');
    assert.deepEqual(JSON.parse(seen[1].body), { data: { project: '9' } });
  });

  it('tasks.create with a project works when the API returns only gid', async () => {
    respond = entry => (entry.url === '/tasks' ? [201, { data: { gid: '11' } }] : [200, { data: {} }]);
    await call(client().tasks, 'create', '7', '9', { name: 't' });
    // Known defect in 1.x: it reads `task.id`, which the API stopped sending.
    assert.equal(seen[1].url, LEGACY ? '/tasks/undefined/addProject' : '/tasks/11/addProject');
  });

  it('tasks.edit puts the task data and yields the task', async () => {
    respond = () => [200, { data: { gid: '5', name: 'renamed' } }];
    const [err, task] = await call(client().tasks, 'edit', '5', { name: 'renamed' });
    assert.equal(err, null);
    assert.equal(seen[0].method, 'PUT');
    assert.equal(seen[0].url, '/tasks/5');
    assert.deepEqual(JSON.parse(seen[0].body), { data: { name: 'renamed' } });
    // Known defect in 1.x: it unwraps `.data` twice and yields undefined.
    assert.deepEqual(task, LEGACY ? undefined : { gid: '5', name: 'renamed' });
  });

  it('users.tasks collects the tasks assigned in every workspace', async () => {
    const key = LEGACY ? 'id' : 'gid';
    respond = entry => {
      if (entry.url === '/workspaces') return [200, { data: [{ [key]: '1' }, { [key]: '2' }] }];
      if (entry.url.includes('workspace=1')) return [200, { data: [{ gid: 'a' }] }];
      return [200, { data: [{ gid: 'b' }, { gid: 'c' }] }];
    };
    const [err, tasks] = await call(client().users, 'tasks', 'me');
    assert.equal(err, null);
    assert.deepEqual(tasks.map(task => task.gid).sort(), ['a', 'b', 'c']);
    assert.ok(seen.some(entry => entry.url === '/tasks?workspace=1&assignee=me'));
  });
});

describe('errors', () => {
  it('reports an error response with its status and parsed body', async () => {
    respond = () => [404, { errors: [{ message: 'No such task' }] }];
    const [err, result] = await call(client().tasks, 'get', '5');
    assert.equal(result, undefined);
    assert.ok(err instanceof Error);
    assert.equal(err.message, 'Asana Error (404): Not Found');
    assert.equal(err.status, 404);
    assert.deepEqual(err.result, { errors: [{ message: 'No such task' }] });
  });

  it('reports a failure to connect', async () => {
    const instance = client();
    instance.url = 'http://127.0.0.1:1';
    const [err] = await call(instance.users, 'me');
    assert.ok(err instanceof Error);
  });

  it('handles a success response whose body is not JSON', async () => {
    respond = () => [200, 'not json'];
    const [err, result] = await call(client().users, 'me');
    if (LEGACY) {
      // Known defect: indistinguishable from an empty success.
      assert.equal(err, null);
      assert.equal(result, undefined);
    } else {
      assert.ok(err instanceof Error);
      assert.equal(err.status, 200);
    }
  });
});

describe('oauth refresh', () => {
  const oauth = {
    accessToken: 'expired',
    refreshToken: 'refresh',
    clientId: 'id',
    clientSecret: 'secret',
    redirectUrl: 'https://example.com/cb'
  };

  if (LEGACY) {
    it('1.x: a successful refresh crashes the process', async () => {
      // Known defect. `refreshToken` assigns to `options.headers`, and
      // `options` is not in scope there. The documented flow never worked.
      respond = entry => {
        if (entry.url === '/-/oauth_token') return [200, { access_token: 'fresh' }];
        return entry.authorization === 'Bearer fresh' ? [200, { data: {} }] : [401, {}];
      };
      const result = await child(`
        const c = require('.').createClient({ oauth: ${JSON.stringify(oauth)} });
        c.url = process.env.ASANA_BASE;
        c.oauthUrl = process.env.ASANA_BASE + '/-/oauth_token';
        c.users.me(err => { console.log('CALLBACK', err && err.message); });
      `);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, /ReferenceError: options is not defined/);
    });
  } else {
    it('2.x: refreshes once on a 401 and retries with the new token', async () => {
      respond = entry => {
        if (entry.url === '/-/oauth_token') return [200, { access_token: 'fresh' }];
        return entry.authorization === 'Bearer fresh' ? [200, { data: { gid: 'me' } }] : [401, {}];
      };
      const instance = client({ oauth: { ...oauth } });
      const [err, user] = await call(instance.users, 'me');
      assert.equal(err, null);
      assert.deepEqual(user, { gid: 'me' });
      assert.deepEqual(
        seen.map(entry => entry.url),
        ['/users/me', '/-/oauth_token', '/users/me']
      );
      const form = new URLSearchParams(seen[1].body);
      assert.equal(form.get('grant_type'), 'refresh_token');
      assert.equal(form.get('refresh_token'), 'refresh');
      assert.equal(form.get('client_id'), 'id');
      assert.equal(instance.oauth.accessToken, 'fresh');
    });

    it('2.x: reports the 401 when the refreshed token is rejected too', async () => {
      respond = entry =>
        entry.url === '/-/oauth_token' ? [200, { access_token: 'fresh' }] : [401, { errors: [] }];
      const [err] = await call(client({ oauth: { ...oauth } }).users, 'me');
      assert.equal(err.status, 401);
      assert.equal(seen.filter(entry => entry.url === '/-/oauth_token').length, 1);
    });
  }
});
