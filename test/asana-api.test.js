/*
 * asana-api.test.js: Tests for the promise API, pagination, and errors.
 *
 * (C) 2012 Charlie Robbins
 *
 * These use the `fetch` option to answer requests in-process. The requests
 * that 1.x also made are pinned in characterization.test.cjs.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import asana, { AsanaError, Client, createClient } from 'asana-api'

/**
 * Builds a client whose fetch records each call and answers from `respond`.
 * @param {(call: { url: URL, method: string, headers: Record<string, string>, body?: string }) => [number, unknown]} [respond]
 * @param {import('asana-api').ClientOptions} [options]
 */
function stub(respond = () => [200, { data: {} }], options = { token: 'tok' }) {
  /** @type {Array<{ url: URL, method: string, headers: Record<string, string>, body?: string }>} */
  const calls = []
  const client = createClient({
    ...options,
    fetch: async (input, init = {}) => {
      const call = {
        url: new URL(String(input)),
        method: init.method ?? 'GET',
        headers: /** @type {Record<string, string>} */ (init.headers),
        body: /** @type {string | undefined} */ (init.body)
      }
      calls.push(call)
      const [status, payload] = respond(call)
      return new Response(typeof payload === 'string' ? payload : JSON.stringify(payload), {
        status
      })
    }
  })
  return { client, calls }
}

describe('exports', () => {
  it('offers named exports and a default with the same members', () => {
    assert.equal(asana.createClient, createClient)
    assert.equal(asana.Client, Client)
    assert.equal(asana.AsanaError, AsanaError)
    assert.ok(createClient({ token: 't' }) instanceof Client)
  })
})

describe('createClient', () => {
  it('requires a token', () => {
    assert.throws(() => createClient({}), /token/)
    // @ts-expect-error options are required
    assert.throws(() => createClient(), /token/)
  })

  it('refuses an API key and names the replacement', () => {
    // @ts-expect-error apiKey is no longer an option
    assert.throws(() => createClient({ apiKey: 'k' }), /`token`/)
  })

  it('does not write to the options it is given', () => {
    const oauth = { refreshToken: 'r' }
    const options = Object.freeze({ token: 't', oauth: Object.freeze(oauth) })
    const client = createClient(options)
    assert.equal(client.oauth.accessToken, 't')
    assert.deepEqual(oauth, { refreshToken: 'r' })
  })

  it('defaults to the Asana API and accepts another base URL', async () => {
    assert.equal(createClient({ token: 't' }).url, 'https://app.asana.com/api/1.0')
    const { client, calls } = stub(undefined, { token: 't', url: 'http://localhost:1234/api' })
    await client.users.me()
    assert.equal(calls[0].url.href, 'http://localhost:1234/api/users/me')
  })
})

describe('promises and callbacks', () => {
  it('returns a promise for the data when no callback is given', async () => {
    const { client } = stub(() => [200, { data: { gid: 'me' } }])
    const pending = client.users.me()
    assert.ok(pending instanceof Promise)
    assert.deepEqual(await pending, { gid: 'me' })
  })

  it('calls back when a callback is given, and still returns a promise', async () => {
    const { client } = stub(() => [200, { data: { gid: 'me' } }])
    /** @type {unknown[]} */
    let called = []
    const returned = client.users.me((...args) => {
      called = args
    })
    assert.deepEqual(await returned, { gid: 'me' })
    assert.deepEqual(called, [null, { gid: 'me' }])
  })

  it('does not reject the returned promise when a callback takes the error', async () => {
    const { client } = stub(() => [500, { errors: [] }])
    /** @type {any} */
    let seen
    const result = await client.users.me(err => {
      seen = err
    })
    assert.equal(result, undefined)
    assert.equal(seen.status, 500)
  })

  it('rejects with an AsanaError carrying the status and the body', async () => {
    const { client } = stub(() => [403, { errors: [{ message: 'Forbidden' }] }])
    await assert.rejects(client.tasks.get('1'), (/** @type {any} */ err) => {
      assert.ok(err instanceof AsanaError)
      assert.ok(err instanceof Error)
      assert.equal(err.name, 'AsanaError')
      assert.equal(err.message, 'Asana Error (403): Forbidden')
      assert.equal(err.status, 403)
      assert.deepEqual(err.result, { errors: [{ message: 'Forbidden' }] })
      return true
    })
  })

  it('rejects when a success response is not JSON, keeping the parse error', async () => {
    const { client } = stub(() => [200, '<html>'])
    await assert.rejects(client.users.me(), (/** @type {any} */ err) => {
      assert.equal(err.status, 200)
      assert.equal(err.result, '<html>')
      assert.ok(err.cause instanceof SyntaxError)
      return true
    })
  })

  it('resolves undefined for an empty success body', async () => {
    const { client } = stub(() => [200, ''])
    assert.equal(await client.tasks.remove('1'), undefined)
  })

  it('wraps a failed fetch and keeps it as the cause', async () => {
    const failure = new TypeError('fetch failed')
    const client = createClient({
      token: 't',
      fetch: async () => {
        throw failure
      }
    })
    await assert.rejects(client.users.me(), (/** @type {any} */ err) => {
      assert.ok(err instanceof AsanaError)
      assert.equal(err.cause, failure)
      assert.equal(err.status, undefined)
      return true
    })
  })
})

describe('query parameters', () => {
  it('passes a query object on the read methods', async () => {
    const { client, calls } = stub(() => [200, { data: [] }])
    await client.projects.list({ workspace: '7', opt_fields: 'name,owner' })
    await client.users.list({ workspace: '7' })
    await client.users.get('42', { opt_fields: 'email' })
    await client.tasks.get('5', { opt_fields: 'name' })
    await client.workspaces.projects('7', { archived: false })
    assert.deepEqual(
      calls.map(call => call.url.pathname + call.url.search),
      [
        '/api/1.0/projects?workspace=7&opt_fields=name%2Cowner',
        '/api/1.0/users/?workspace=7',
        '/api/1.0/users/42?opt_fields=email',
        '/api/1.0/tasks/5?opt_fields=name',
        '/api/1.0/workspaces/7/projects?archived=false'
      ]
    )
  })

  it('accepts a query and a callback together', async () => {
    const { client, calls } = stub(() => [200, { data: [] }])
    await new Promise(resolve => client.tags.list({ workspace: '7' }, resolve))
    assert.equal(calls[0].url.search, '?workspace=7')
  })

  it('leaves out parameters that are null or undefined', async () => {
    const { client, calls } = stub(() => [200, { data: [] }])
    await client.workspaces.tasks({ workspace: '7', assignee: undefined, project: null })
    assert.equal(calls[0].url.search, '?workspace=7')
  })
})

describe('writes', () => {
  it('does not change the data object it is given', async () => {
    const { client } = stub(() => [201, { data: { gid: '1' } }])
    const task = Object.freeze({ name: 't' })
    const tag = Object.freeze({ name: 'urgent' })
    await client.tasks.create('7', null, task)
    await client.tags.create('7', tag)
    assert.deepEqual(task, { name: 't' })
    assert.deepEqual(tag, { name: 'urgent' })
  })

  it('adds a new task to each project of an array', async () => {
    const { client, calls } = stub(call =>
      call.url.pathname.endsWith('/tasks') ? [201, { data: { gid: '11' } }] : [200, { data: {} }]
    )
    const task = await client.tasks.create('7', ['8', '9'], { name: 't' })
    assert.equal(task.gid, '11')
    assert.deepEqual(
      calls.slice(1).map(call => [call.url.pathname, JSON.parse(call.body ?? '')]),
      [
        ['/api/1.0/tasks/11/addProject', { data: { project: '8' } }],
        ['/api/1.0/tasks/11/addProject', { data: { project: '9' } }]
      ]
    )
  })

  it('reports the failure when a new task cannot be added to its project', async () => {
    const { client } = stub(call =>
      call.url.pathname.endsWith('/tasks') ? [201, { data: { gid: '11' } }] : [404, { errors: [] }]
    )
    await assert.rejects(client.tasks.create('7', '9', { name: 't' }), { status: 404 })
  })
})

describe('users.tasks', () => {
  it('skips a workspace the user is only a guest of', async () => {
    const { client } = stub(call => {
      if (call.url.pathname.endsWith('/workspaces')) {
        return [200, { data: [{ gid: '1' }, { gid: '2' }] }]
      }
      return call.url.searchParams.get('workspace') === '1'
        ? [403, { errors: [{ message: 'Not a user in workspace' }] }]
        : [200, { data: [{ gid: 'b' }] }]
    })
    assert.deepEqual(await client.users.tasks('me'), [{ gid: 'b' }])
  })

  it('reports any other failure once', async () => {
    const { client } = stub(call =>
      call.url.pathname.endsWith('/workspaces')
        ? [200, { data: [{ gid: '1' }, { gid: '2' }] }]
        : [500, { errors: [{ message: 'Server Error' }] }]
    )
    let settled = 0
    const err = await new Promise(resolve => {
      client.users.tasks('me', error => {
        settled += 1
        resolve(error)
      })
    })
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(err.status, 500)
    assert.equal(settled, 1)
  })
})

describe('pages', () => {
  it('follows next_page until the list ends', async () => {
    const { client, calls } = stub(call => {
      const offset = call.url.searchParams.get('offset')
      if (!offset) return [200, { data: [{ gid: 'a' }, { gid: 'b' }], next_page: { offset: 'p2' } }]
      if (offset === 'p2') return [200, { data: [{ gid: 'c' }], next_page: { offset: 'p3' } }]
      return [200, { data: [{ gid: 'd' }], next_page: null }]
    })

    const gids = []
    for await (const task of client.pages({ path: '/tasks', query: { project: '9' } })) {
      gids.push(task.gid)
    }

    assert.deepEqual(gids, ['a', 'b', 'c', 'd'])
    assert.deepEqual(
      calls.map(call => call.url.search),
      ['?limit=100&project=9', '?limit=100&project=9&offset=p2', '?limit=100&project=9&offset=p3']
    )
  })

  it('takes a path and honours a caller limit', async () => {
    const { client, calls } = stub(() => [200, { data: [] }])
    for await (const _ of client.pages('/workspaces')) assert.fail('no items expected')
    for await (const _ of client.pages({ path: '/tags', query: { limit: 5 } })) assert.fail()
    assert.deepEqual(
      calls.map(call => call.url.search),
      ['?limit=100', '?limit=5']
    )
  })

  it('stops at the first error', async () => {
    const { client } = stub(() => [429, { errors: [{ message: 'Rate limited' }] }])
    await assert.rejects(
      async () => {
        for await (const _ of client.pages('/tasks')) assert.fail()
      },
      { status: 429 }
    )
  })
})

describe('token refresh', () => {
  const oauth = { accessToken: 'old', refreshToken: 'r', clientId: 'id', clientSecret: 's' }

  it('shares one refresh between requests that expire together', async () => {
    const { client, calls } = stub(
      call => {
        if (call.url.pathname === '/-/oauth_token') return [200, { access_token: 'new' }]
        return call.headers.authorization === 'Bearer new' ? [200, { data: {} }] : [401, {}]
      },
      { oauth: { ...oauth } }
    )
    await Promise.all([client.users.me(), client.workspaces.list(), client.projects.list()])
    assert.equal(calls.filter(call => call.url.pathname === '/-/oauth_token').length, 1)
    assert.equal(client.authHeader, 'Bearer new')
  })

  it('does not refresh without a refresh token', async () => {
    const { client, calls } = stub(() => [401, {}], { token: 'old' })
    await assert.rejects(client.users.me(), { status: 401 })
    assert.equal(calls.length, 1)
  })

  it('reports a refused refresh with the description Asana gives', async () => {
    const { client } = stub(
      call =>
        call.url.pathname === '/-/oauth_token'
          ? [400, { error: 'invalid_grant', error_description: 'The refresh token is invalid' }]
          : [401, {}],
      { oauth: { ...oauth } }
    )
    await assert.rejects(client.users.me(), (/** @type {any} */ err) => {
      assert.equal(err.message, 'Asana OAuth Refresh Error (400): The refresh token is invalid')
      assert.equal(err.status, 400)
      return true
    })
  })

  it('can refresh again after a refresh has finished', async () => {
    let issued = 0
    const { client } = stub(
      call => {
        if (call.url.pathname === '/-/oauth_token') return [200, { access_token: `new${++issued}` }]
        return [200, { data: {} }]
      },
      { oauth: { ...oauth } }
    )
    await client.refreshToken()
    await client.refreshToken()
    assert.equal(client.oauth.accessToken, 'new2')
  })
})
