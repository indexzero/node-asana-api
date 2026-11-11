/*
 * examples.test.js: Runs every file in examples/ against a local server and
 * checks one line of its output.
 *
 * (C) 2012 Charlie Robbins
 */

import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { readdirSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = path.join(import.meta.dirname, '..')

/**
 * What each example must print, and the arguments it takes.
 * @type {Record<string, { args: string[], output: string }>}
 */
const expected = {
  'callbacks.cjs': { args: [], output: 'workspaces: Engineering, Design' },
  'errors.js': { args: [], output: '404: Asana Error (404): Not Found\ntask: Unknown object: 0' },
  'pages.js': { args: ['9'], output: '1 first\n2 second\n3 third\n3 tasks' },
  'whoami.js': { args: [], output: 'Ada Lovelace <ada@example.com>' }
}

/** @type {http.Server} */
let server
/** @type {string} */
let base

before(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    /** @type {[number, unknown]} */
    let reply = [404, { errors: [{ message: 'task: Unknown object: 0' }] }]

    if (req.headers.authorization !== 'Bearer example-token') {
      reply = [401, { errors: [{ message: 'Not Authorized' }] }]
    } else if (url.pathname === '/users/me') {
      reply = [200, { data: { gid: '1', name: 'Ada Lovelace', email: 'ada@example.com' } }]
    } else if (url.pathname === '/workspaces') {
      reply = [200, { data: [{ gid: '7', name: 'Engineering' }, { gid: '8', name: 'Design' }] }]
    } else if (url.pathname === '/projects/9/tasks') {
      reply = url.searchParams.has('offset')
        ? [200, { data: [{ gid: '3', name: 'third' }], next_page: null }]
        : [
            200,
            {
              data: [
                { gid: '1', name: 'first' },
                { gid: '2', name: 'second' }
              ],
              next_page: { offset: 'next' }
            }
          ]
    }

    res.writeHead(reply[0], { 'content-type': 'application/json' })
    res.end(JSON.stringify(reply[1]))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(undefined)))
  const address = /** @type {import('node:net').AddressInfo} */ (server.address())
  base = `http://127.0.0.1:${address.port}`
})

after(() => new Promise(resolve => server.close(resolve)))

describe('examples', () => {
  const files = readdirSync(path.join(root, 'examples')).sort()

  it('has an expectation for every example, and no others', () => {
    assert.deepEqual(files, Object.keys(expected).sort())
  })

  for (const file of files) {
    it(`${file} prints what it should`, async () => {
      const { stdout } = await run(
        process.execPath,
        [path.join(root, 'examples', file), ...expected[file].args],
        { env: { ...process.env, ASANA_ACCESS_TOKEN: 'example-token', ASANA_API_URL: base } }
      )
      assert.equal(stdout.trim(), expected[file].output)
    })
  }
})
