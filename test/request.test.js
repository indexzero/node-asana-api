/*
 * request.test.js: Tests for request options, the OAuth refresh, and the
 * edges an independent review found untested.
 *
 * (C) 2012 Charlie Robbins
 */

import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { describe, it } from 'node:test'
import { promisify } from 'node:util'
import { AsanaError, createClient } from 'asana-api'

const run = promisify(execFile)
const root = path.join(import.meta.dirname, '..')

/**
 * @typedef {{ url: URL, method: string, headers: Record<string, string>, body?: string }} Call
 */

/**
 * Builds a client whose fetch records each call and answers from `respond`,
 * which may be async.
 * @param {(call: Call) => [number, unknown] | Promise<[number, unknown]>} [respond]
 * @param {import('asana-api').ClientOptions} [options]
 */
function stub(respond = () => [200, { data: {} }], options = { token: 'tok' }) {
  /** @type {Call[]} */
  const calls = []
  const client = createClient({
    ...options,
    fetch: async (input, init = {}) => {
      const call = {
        url: new URL(String(input)),
        method: init.method ?? 'GET',
        headers: init.headers ?? {},
        body: init.body
      }
      calls.push(call)
      const [status, payload] = await respond(call)
      return new Response(typeof payload === 'string' ? payload : JSON.stringify(payload), {
        status
      })
    }
  })
  return { client, calls }
}

const oauth = {
  accessToken: 'old',
  refreshToken: 'r',
  clientId: 'id',
  clientSecret: 'secret',
  redirectUrl: 'https://example.com/cb'
}

/** @param {Call} call */
const isRefresh = call => call.url.pathname === '/-/oauth_token'

describe('createClient credentials', () => {
  it('prefers `token` to `oauth.accessToken`', () => {
    const client = createClient({ token: 'a', oauth: { accessToken: 'b' } })
    assert.equal(client.authHeader, 'Bearer a')
  })

  it('ignores an `apiKey` when a token is present, as 1.x did', () => {
    // A 1.x config often passed both from the environment.
    // @ts-expect-error apiKey is no longer an option
    assert.equal(createClient({ apiKey: undefined, token: 't' }).authHeader, 'Bearer t')
    // @ts-expect-error apiKey is no longer an option
    assert.equal(createClient({ apiKey: 'k', token: 't' }).authHeader, 'Bearer t')
  })

  it('names `token` when only an `apiKey` is given', () => {
    // @ts-expect-error apiKey is no longer an option
    assert.throws(() => createClient({ apiKey: 'k' }), /`apiKey` is not supported.*`token`/s)
    // @ts-expect-error apiKey is no longer an option
    assert.throws(() => createClient({ apiKey: '' }), /`token` or `oauth.accessToken` is required/)
  })

  it('warns once that `proxy` is ignored', async () => {
    /** @type {string[]} */
    const warnings = []
    /** @param {Error} warning */
    const listen = warning => warnings.push(warning.message)
    process.on('warning', listen)
    // @ts-expect-error proxy is no longer an option
    createClient({ token: 't', proxy: 'http://proxy:8080' })
    // @ts-expect-error proxy is no longer an option
    createClient({ token: 't', proxy: 'http://proxy:8080' })
    await new Promise(resolve => setImmediate(resolve))
    process.off('warning', listen)
    assert.equal(warnings.filter(message => /`proxy` option is ignored/.test(message)).length, 1)
  })

  it('uses the global fetch as it is when the request is made', async () => {
    const client = createClient({ token: 't' })
    const original = globalThis.fetch
    globalThis.fetch = async () => new Response(JSON.stringify({ data: { gid: 'late' } }))
    try {
      assert.deepEqual(await client.users.me(), { gid: 'late' })
    } finally {
      globalThis.fetch = original
    }
  })
})

describe('request options', () => {
  it('sends to `uri` in place of the base URL', async () => {
    const { client, calls } = stub()
    await client.request({ uri: 'http://other.example/v2', path: '/thing' })
    assert.equal(calls[0].url.href, 'http://other.example/v2/thing')
  })

  it('sends a string body as it is', async () => {
    const { client, calls } = stub()
    await client.request({ method: 'POST', path: '/x', body: '{"raw":true}' })
    assert.equal(calls[0].body, '{"raw":true}')
  })

  it('form-encodes an object body when the content type is not JSON', async () => {
    const { client, calls } = stub()
    await client.request({
      method: 'POST',
      path: '/x',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: { a: '1', b: 'two words' }
    })
    assert.equal(calls[0].body, 'a=1&b=two+words')
  })

  it('JSON-encodes when the content type carries a charset', async () => {
    const { client, calls } = stub()
    await client.request({
      method: 'POST',
      path: '/x',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: { a: 1 }
    })
    assert.equal(calls[0].body, '{"a":1}')
  })

  it('sends no body for null, an empty string, or a DELETE', async () => {
    const { client, calls } = stub()
    await client.request({ path: '/x', body: null })
    await client.request({ path: '/x', body: '' })
    await client.tasks.remove('5')
    assert.deepEqual(
      calls.map(call => call.body),
      [undefined, undefined, undefined]
    )
  })

  it('adds caller headers and lets them replace the defaults in any case', async () => {
    const { client, calls } = stub()
    await client.request({
      path: '/x',
      headers: { 'X-Trace': 'abc', Authorization: 'Bearer other', 'Content-Type': 'text/plain' }
    })
    assert.deepEqual(calls[0].headers, {
      'content-type': 'text/plain',
      authorization: 'Bearer other',
      'x-trace': 'abc'
    })
  })

  it('joins an array in the query with commas', async () => {
    const { client, calls } = stub()
    await client.tasks.get('5', { opt_fields: ['name', 'notes'] })
    assert.equal(calls[0].url.search, '?opt_fields=name%2Cnotes')
  })

  it('passes the query on every read method that takes one', async () => {
    const { client, calls } = stub(() => [200, { data: [] }])
    await client.users.get({ workspace: '7' })
    await client.tags.tasks('3', { opt_fields: 'name' })
    await client.workspaces.teams('7', { limit: 10 })
    await client.tasks.stories('5', { limit: 2 })
    assert.deepEqual(
      calls.map(call => call.url.pathname + call.url.search),
      [
        '/api/1.0/users?workspace=7',
        '/api/1.0/tags/3/tasks?opt_fields=name',
        '/api/1.0/workspaces/7/teams?limit=10',
        '/api/1.0/tasks/5/stories?limit=2'
      ]
    )
  })

  it('lists users when the id is empty or zero, as 1.x did', async () => {
    const { client, calls } = stub(() => [200, { data: [] }])
    await client.users.get('')
    await client.users.get(0)
    assert.deepEqual(
      calls.map(call => call.url.pathname),
      ['/api/1.0/users', '/api/1.0/users']
    )
  })
})

describe('error bodies', () => {
  it('keeps the text of an error response that is not JSON', async () => {
    const { client } = stub(() => [502, '<html>Bad Gateway</html>'])
    await assert.rejects(client.users.me(), (/** @type {any} */ err) => {
      assert.equal(err.message, 'Asana Error (502): Bad Gateway')
      assert.equal(err.status, 502)
      assert.equal(err.result, '<html>Bad Gateway</html>')
      assert.ok(err.cause instanceof SyntaxError)
      return true
    })
  })

  it('has no result for an error response with an empty body', async () => {
    const { client } = stub(() => [500, ''])
    await assert.rejects(client.users.me(), (/** @type {any} */ err) => {
      assert.equal(err.status, 500)
      assert.equal(err.result, undefined)
      assert.equal(err.cause, undefined)
      return true
    })
  })
})

describe('callbacks that throw', () => {
  it('surface as an uncaught exception, not an unhandled rejection', async () => {
    const source = `
      const { createClient } = require('asana-api')
      process.on('unhandledRejection', err => console.log('UNHANDLED ' + err.message))
      process.on('uncaughtException', err => console.log('UNCAUGHT ' + err.message))
      const reply = status => async () => new Response(JSON.stringify({ data: {} }), { status })
      createClient({ token: 't', fetch: reply(200) }).users.me(() => { throw new Error('on success') })
      createClient({ token: 't', fetch: reply(500) }).users.me(() => { throw new Error('on failure') })
    `
    const { stdout } = await run(process.execPath, ['-e', source], { cwd: root })
    assert.deepEqual(stdout.trim().split('\n').sort(), [
      'UNCAUGHT on failure',
      'UNCAUGHT on success'
    ])
  })
})

describe('pages', () => {
  it('rejects when the endpoint does not return a list', async () => {
    const { client } = stub(() => [200, { data: { gid: 'me' } }])
    await assert.rejects(
      async () => {
        for await (const _ of client.pages('/users/me')) assert.fail()
      },
      { name: 'AsanaError', message: 'Asana Error: /users/me did not return a list' }
    )
  })

  it('keeps a limit that is already in the path', async () => {
    const { client, calls } = stub(() => [200, { data: [] }])
    for await (const _ of client.pages('/tasks?project=9&limit=5')) assert.fail()
    assert.equal(calls[0].url.search, '?project=9&limit=5')
  })

  it('refreshes an expired token in the middle of a walk and carries on', async () => {
    let expired = false
    const { client, calls } = stub(
      call => {
        if (isRefresh(call)) return [200, { access_token: 'new' }]
        if (call.url.searchParams.get('offset') === 'p2') {
          if (call.headers.authorization === 'Bearer old') {
            expired = true
            return [401, {}]
          }
          return [200, { data: [{ gid: 'b' }] }]
        }
        return [200, { data: [{ gid: 'a' }], next_page: { offset: 'p2' } }]
      },
      { oauth: { ...oauth } }
    )
    const gids = []
    for await (const item of client.pages('/tasks')) gids.push(item.gid)
    assert.deepEqual(gids, ['a', 'b'])
    assert.ok(expired)
    assert.equal(calls.filter(isRefresh).length, 1)
  })
})

describe('tasks.create', () => {
  it('skips the project step for an empty project, as 1.x did', async () => {
    const { client, calls } = stub(() => [201, { data: { gid: '11' } }])
    await client.tasks.create('7', '', { name: 't' })
    await client.tasks.create('7', 0, { name: 't' })
    await client.tasks.create('7', undefined, { name: 't' })
    assert.ok(calls.every(call => call.url.pathname === '/api/1.0/tasks'))
  })

  it('rejects with an AsanaError when Asana returns no task', async () => {
    const { client } = stub(() => [201, ''])
    await assert.rejects(client.tasks.create('7', '9', { name: 't' }), {
      name: 'AsanaError',
      message: 'Asana Error: the response to creating a task had no gid'
    })
  })

  it('hands back the new task when adding it to a project fails', async () => {
    const { client } = stub(call =>
      call.url.pathname.endsWith('/tasks') ? [201, { data: { gid: '11' } }] : [403, { errors: [] }]
    )
    await assert.rejects(client.tasks.create('7', '9', { name: 't' }), (/** @type {any} */ err) => {
      assert.ok(err instanceof AsanaError)
      assert.equal(err.status, 403)
      assert.deepEqual(err.task, { gid: '11' })
      return true
    })
  })

  it('accepts a task described by an interface-like object', async () => {
    const { client, calls } = stub(() => [201, { data: { gid: '11' } }])
    class NewTask {
      name = 'from a class'
    }
    await client.tasks.create('7', null, new NewTask())
    assert.deepEqual(JSON.parse(calls[0].body ?? ''), {
      data: { name: 'from a class', workspace: '7' }
    })
  })
})

describe('token refresh', () => {
  it('sends the credentials as a form', async () => {
    const { client, calls } = stub(
      call => (isRefresh(call) ? [200, { access_token: 'new' }] : [200, { data: {} }]),
      { oauth: { ...oauth } }
    )
    await client.refreshToken()
    assert.equal(calls[0].method, 'POST')
    assert.equal(calls[0].headers['content-type'], 'application/x-www-form-urlencoded')
    assert.deepEqual(Object.fromEntries(new URLSearchParams(calls[0].body)), {
      client_id: 'id',
      client_secret: 'secret',
      redirect_uri: 'https://example.com/cb',
      grant_type: 'refresh_token',
      refresh_token: 'r'
    })
  })

  it('leaves a request with its own authorization alone on a 401', async () => {
    // It asked to act as someone else. Replaying it with this client's
    // token would run it under a different identity.
    const { client, calls } = stub(
      call => (isRefresh(call) ? [200, { access_token: 'new' }] : [401, { errors: [] }]),
      { oauth: { ...oauth } }
    )
    await assert.rejects(
      client.request({ path: '/x', headers: { Authorization: 'Bearer someone-else' } }),
      { status: 401 }
    )
    assert.equal(calls.length, 1)
    assert.equal(calls[0].headers.authorization, 'Bearer someone-else')
    assert.equal(client.oauth.accessToken, 'old')
  })

  it('does not refresh again for a 401 that arrives after the refresh', async () => {
    let issued = 0
    const { client, calls } = stub(
      async call => {
        if (isRefresh(call)) return [200, { access_token: `new${++issued}` }]
        if (call.headers.authorization !== 'Bearer old') return [200, { data: {} }]
        // The slow request's 401 lands after the fast one has refreshed.
        if (call.url.pathname.endsWith('/slow'))
          await new Promise(resolve => setTimeout(resolve, 30))
        return [401, {}]
      },
      { oauth: { ...oauth } }
    )
    await Promise.all([client.request('/fast'), client.request('/slow')])
    assert.equal(calls.filter(isRefresh).length, 1)
    assert.equal(calls.at(-1)?.headers.authorization, 'Bearer new1')
  })

  it('keeps a refresh token that the provider rotates', async () => {
    const { client } = stub(() => [200, { access_token: 'new', refresh_token: 'r2' }], {
      oauth: { ...oauth }
    })
    await client.refreshToken()
    assert.equal(client.oauth.refreshToken, 'r2')
  })

  it('rejects a reply with no access token', async () => {
    const { client } = stub(() => [200, { token_type: 'bearer' }], { oauth: { ...oauth } })
    await assert.rejects(client.refreshToken(), {
      message: 'Asana OAuth Refresh Error (200): no access token returned',
      status: 200
    })
    assert.equal(client.oauth.accessToken, 'old')
  })

  it('keeps the status of a reply that is not JSON', async () => {
    const { client } = stub(() => [502, '<html>'], { oauth: { ...oauth } })
    await assert.rejects(client.refreshToken(), (/** @type {any} */ err) => {
      assert.equal(err.status, 502)
      assert.equal(err.result, '<html>')
      assert.ok(err.cause instanceof SyntaxError)
      return true
    })
  })

  it('rejects without a request when there is no refresh token', async () => {
    const { client, calls } = stub(undefined, { token: 't' })
    await assert.rejects(client.refreshToken(), /no `oauth.refreshToken`/)
    assert.equal(calls.length, 0)
  })
})
