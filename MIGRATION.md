# Migrating from asana-api 1.x to 2.0

Most 1.x code runs on 2.0 unchanged: `require('asana-api')`, `createClient`,
and a callback as the last argument all still work. This guide lists what
does change.

## Requirements

- Node.js 24 or later. 1.x declared `>= 0.8.0`.
- A personal access token or an OAuth access token. Asana no longer accepts
  API keys.

## Summary

1. Node.js 24 is the minimum
2. The package is an ES module
3. `apiKey` is gone; use `token`
4. Identifiers are `gid` strings, not `id` numbers
5. Methods return a promise, not the `request` object
6. A response that is not JSON is an error
7. Only the documented entry point can be imported
8. The `proxy` option is gone; pass a `fetch`
9. A client needs a token when it is created

## What changed

### Node.js 24 is the minimum

Older versions of Node.js are no longer maintained, and the client now relies
on the built-in `fetch`.

npm warns about the engine at install. Older versions of Node.js may still
load the package, but nothing here is tested on them.

### The package is an ES module

There is one build, and it is ESM. `require()` of an ES module works on every
supported version of Node.js, so CommonJS callers change nothing.

**Before:**

```js
var asana = require('asana-api')
var client = asana.createClient({ token: token })
```

**After**, either of:

```js
const asana = require('asana-api')
const client = asana.createClient({ token })
```

```js
import { createClient } from 'asana-api'
const client = createClient({ token })
```

Tools that implement `require()` themselves, such as older bundlers and test
runners, may not load an ES module this way.

TypeScript callers that compile to CommonJS need `"module": "nodenext"`.
Under `"node16"` the compiler refuses to `require` an ES module.

### `apiKey` is gone; use `token`

Asana retired API keys in favour of personal access tokens. A token goes in
the `token` option, which 1.x already had.

**Before:**

```js
var client = asana.createClient({ apiKey: 'your-secret-api-key' })
```

**After:**

```js
const client = asana.createClient({ token: 'your-personal-access-token' })
```

A missed migration is loud: `createClient` throws a `TypeError` that names
`token`.

An `apiKey` passed alongside a `token` is ignored, as it was in 1.x.

### Identifiers are `gid` strings, not `id` numbers

This is a change in Asana's API, not in the client, but it reaches your code
through every object the client returns. Asana removed the numeric `id` field.
Each object now has a `gid`, which is a string.

**Before:**

```js
client.tasks.get(task.id, callback)
```

**After:**

```js
client.tasks.get(task.gid, callback)
```

A missed migration is quiet: `task.id` is `undefined`, and the request goes to
`/tasks/undefined`. Search your code for `.id` on anything the client returned.

### Methods return a promise, not the `request` object

Every method returns a promise for the result. In 1.x a method returned the
underlying `request` object, which a caller could pipe or listen to.

**Before:**

```js
client.users.me(function (err, me) {
  // ...
})
```

**After**, either the same callback, or:

```js
const me = await client.users.me()
```

When you pass a callback, the returned promise waits for the callback and
does not reject, so there is nothing extra to handle.

An error thrown inside your callback is still an uncaught exception, as it
was in 1.x.

A missed migration is quiet only for code that used the return value. Search
for `.pipe(` and `.on(` on calls to the client.

### A response that is not JSON is an error

In 1.x a `200` response whose body could not be parsed called back with no
error and no result, which looked like an empty success. It now rejects with
an `AsanaError` whose `cause` is the parse error and whose `result` is the
text of the body.

An error response that is not JSON works the same way: `result` is the text.
In 1.x it was the parse error.

### Only the documented entry point can be imported

The package now has an `exports` map. `asana-api` and `asana-api/package.json`
resolve. Deep paths do not.

**Before:**

```js
var Client = require('asana-api/lib/asana-api/client').Client
```

**After:**

```js
const { Client } = require('asana-api')
```

A missed migration is loud: Node.js throws `ERR_PACKAGE_PATH_NOT_EXPORTED`.

### The `proxy` option is gone; pass a `fetch`

`fetch` has no `proxy` setting. To send requests through a proxy, give the
client a `fetch` that does.

**Before:**

```js
var client = asana.createClient({ token: token, proxy: 'http://proxy:8080' })
```

**After:**

```js
const client = createClient({ token, fetch: fetchThroughMyProxy })
```

The `fetch` option takes any function with the signature of the standard
`fetch`. On Node.js 26 the built-in `fetch` also honours `HTTP_PROXY` and
`HTTPS_PROXY` when `NODE_USE_ENV_PROXY=1` is set, with no option at all.

A missed migration is quiet, so the client prints a warning once when it is
given a `proxy` option.

### A client needs a token when it is created

`createClient()` throws a `TypeError` when it is given neither a `token` nor
an `oauth.accessToken`. In 1.x the first request failed instead.

## Fixed

These worked differently in 1.x. No change to your code is needed.

- The OAuth refresh works. On a `401`, a client that has a `refreshToken`
  refreshes once, retries the request, and keeps the new token at
  `client.oauth.accessToken`. Requests that expire together share one
  refresh.
- `tasks.edit()` yields the updated task.
- `tasks.create()` adds the task to its project using the `gid` Asana
  returns, and accepts an array of projects.
- `workspaces.teams()` calls `/workspaces/:workspace/teams`.
- `users.tasks()` settles once when a workspace returns an error. A failure
  to connect now rejects. In 1.x it counted as a workspace with no tasks.
- `tasks.create()` and `tags.create()` no longer add `workspace` to the
  object you pass in.

## Smaller changes

- Errors are instances of `AsanaError`, a subclass of `Error`. The `message`,
  `status` and `result` properties are as before.
- Any `2xx` status is a success. 1.x accepted only `200`, `201` and `204`.
- A request that cannot connect rejects with an `AsanaError` whose `cause` is
  the error from `fetch`.
- `createClient()` copies the `oauth` object it is given. After a refresh,
  read the new token from `client.oauth`, not from your own object.
- An array in a query is sent as one comma-separated value, which is how
  Asana reads lists. 1.x repeated the parameter. A parameter that is null or
  undefined is left out. 1.x sent it empty.
- `users.list()` requests `/users`. 1.x requested `/users/`.
- When `tasks.create()` cannot add the new task to a project, the error
  carries the task as `err.task`.
- These properties of the client are gone: `successCodes`, `proxy`, `apiKey`,
  `authType`, `authToken` and `refreshAttempted`.

## New

- A query object on the methods that read: `client.users.list({ workspace })`.
- `client.pages(path)` to walk every page of a list.
- `url`, `oauthUrl` and `fetch` options on `createClient()`.
- Type declarations ship with the package.

`examples/callbacks.cjs` is 1.x-style code, and `examples/whoami.js` is the
same idea in the new style. Both run in the test suite.
