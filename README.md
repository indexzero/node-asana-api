# asana-api

A small Node.js client for the [Asana API][api]. It has no dependencies:
requests go through the `fetch` that Node.js ships.

Asana publishes an [official client][official] that covers the whole API.
This one covers the everyday resources (users, workspaces, projects, tasks,
tags), returns plain promises, and lets you reach anything else with
`client.request()`.

## Install

```bash
  $ npm install asana-api
```

Requires Node.js 24 or later. The package is an ES module; `require()` works
too.

## Usage

Create a client with a [personal access token][pat], or with the access token
from an OAuth flow.

```js
import { createClient } from 'asana-api'

const client = createClient({
  token: process.env.ASANA_ACCESS_TOKEN
})

const me = await client.users.me()
const workspaces = await client.workspaces.list()
const projects = await client.workspaces.projects(workspaces[0].gid)
```

Every method returns a promise for the `data` of Asana's response.

### Query parameters

The methods that read take an optional query object last. Use it for
`opt_fields`, and for the `workspace` that Asana wants on most lists.

```js
const users = await client.users.list({ workspace: '1234' })
const task = await client.tasks.get('5678', { opt_fields: 'name,due_on,assignee.name' })
```

### Pagination

Asana truncates a long list unless you page through it. `client.pages()`
follows `next_page` for you and yields one item at a time.

```js
for await (const task of client.pages('/projects/1234/tasks')) {
  console.log(task.gid, task.name)
}

// With query parameters:
client.pages({ path: '/tasks', query: { project: '1234', opt_fields: 'name' } })
```

### Writing

```js
// Create a task in a workspace. The second argument is a project gid, an
// array of them, or null.
const task = await client.tasks.create('workspace-gid', 'project-gid', {
  name: 'Write the README',
  notes: 'And keep it short.'
})

await client.tasks.edit(task.gid, { completed: true })
await client.tasks.comment(task.gid, 'Done.')
await client.tasks.remove(task.gid)
```

### Errors

A response that is not a success rejects with an `AsanaError`. It carries the
HTTP `status` and the parsed body as `result`.

```js
import { AsanaError } from 'asana-api'

try {
  await client.tasks.get('0')
} catch (err) {
  if (err instanceof AsanaError) {
    console.log(err.status) // 404
    console.log(err.message) // Asana Error (404): Not Found
    console.log(err.result?.errors?.[0]?.message) // what Asana said
  }
}
```

### OAuth with a refresh token

Give the client enough to refresh an expired access token and it will do so
once on a 401, then retry the request.

```js
const client = createClient({
  oauth: {
    accessToken: 'your-oauth-token',
    refreshToken: 'your-oauth-refresh-token',
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    redirectUrl: 'your-redirect-url'
  }
})
```

After a refresh, the new token is at `client.oauth.accessToken`.

### Any other endpoint

`client.request()` sends an authenticated request to any path and unwraps
`data`, so an endpoint without a method here is still one call away.

```js
const sections = await client.request('/projects/1234/sections')

const story = await client.request({
  method: 'PUT',
  path: '/stories/5678',
  body: { data: { text: 'Edited.' } }
})
```

### Callbacks and `require()`

Code written for 1.x keeps working. Every method still takes a callback as
its last argument, and the package can be loaded with `require()`.

```js
const asana = require('asana-api')

const client = asana.createClient({ token: process.env.ASANA_ACCESS_TOKEN })

client.users.me(function (err, me) {
  console.dir(me)
})
```

See `MIGRATION.md` for what changed between 1.x and 2.0.

### Options

| Option     | Purpose                                                               |
| ---------- | --------------------------------------------------------------------- |
| `token`    | A personal access token or an OAuth access token.                     |
| `oauth`    | `{ accessToken, refreshToken, clientId, clientSecret, redirectUrl }`. |
| `url`      | Base URL of the API. Defaults to `https://app.asana.com/api/1.0`.     |
| `oauthUrl` | The OAuth token endpoint. Defaults to Asana's.                        |
| `fetch`    | A `fetch` to use in place of the global one, for a proxy or a test.   |

## API Coverage

```scala
  client.users.list()                 GET    /users
  client.users.me()                   GET    /users/me
  client.users.get(user)              GET    /users/:user
  client.users.tasks(user)            GET    /tasks, once for each workspace

  client.workspaces.list()            GET    /workspaces
  client.workspaces.tasks(query)      GET    /tasks
  client.workspaces.projects(ws)      GET    /workspaces/:workspace/projects
  client.workspaces.teams(ws)         GET    /workspaces/:workspace/teams

  client.projects.list()              GET    /projects
  client.projects.tasks(project)      GET    /projects/:project/tasks

  client.tasks.create(ws, proj, data) POST   /tasks
                                      POST   /tasks/:task/addProject
  client.tasks.get(task)              GET    /tasks/:task
  client.tasks.edit(task, data)       PUT    /tasks/:task
  client.tasks.remove(task)           DELETE /tasks/:task
  client.tasks.stories(task)          GET    /tasks/:task/stories
  client.tasks.comment(task, text)    POST   /tasks/:task/stories

  client.tags.list()                  GET    /tags
  client.tags.get(tag)                GET    /tags/:tag
  client.tags.tasks(tag)              GET    /tags/:tag/tasks
  client.tags.create(ws, data)        POST   /tags
  client.tags.update(tag, data)       PUT    /tags/:tag
```

## Examples

The programs in `examples/` each take a token from `ASANA_ACCESS_TOKEN`.

```bash
  $ ASANA_ACCESS_TOKEN=... node examples/whoami.js
```

## Run Tests

```bash
  $ pnpm install
  $ pnpm test
  $ pnpm run check
```

The tests answer requests from a local server. None of them talk to Asana.

#### AUTHOR: [Charlie Robbins][0]

#### LICENSE: MIT

[0]: http://sudomakethought.com
[api]: https://developers.asana.com/reference/rest-api-reference
[official]: https://github.com/Asana/node-asana
[pat]: https://developers.asana.com/docs/personal-access-token
