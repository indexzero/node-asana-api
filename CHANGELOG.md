# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - Unreleased

See `MIGRATION.md` for how to move from 1.x.

### Added

- Every method returns a promise. A trailing callback still works.
- A query object on the methods that read, for `opt_fields`, `workspace`,
  and other parameters.
- `client.pages()` walks every page of a list.
- `AsanaError`, with `status`, `result` and `cause`.
- `url`, `oauthUrl` and `fetch` options on `createClient()`.
- `tasks.create()` accepts an array of projects.
- When `tasks.create()` cannot add the new task to a project, the error
  carries the task as `err.task`.
- Type declarations, generated from the source.
- Examples in `examples/`, which run in the test suite.

### Changed

- **BREAKING:** Requires Node.js 24 or later.
- **BREAKING:** The package is an ES module with an `exports` map. `require()`
  still works. Deep imports do not.
- **BREAKING:** `apiKey` is removed, because Asana retired API keys.
  `createClient()` throws when given one, or when given no token at all.
- **BREAKING:** Methods return a promise where they returned the `request`
  object.
- **BREAKING:** A success response that is not JSON is an error.
- **BREAKING:** The `proxy` option is removed. Pass a `fetch`.
- `tasks.create()` reads the `gid` of the new task, which is what Asana
  returns now.
- `workspaces.teams()` calls `/workspaces/:workspace/teams`.
- Any `2xx` status is a success.
- The tests run on `node:test` against a local server. They no longer need an
  Asana account.

### Removed

- The `request`, `async` and `errs` dependencies. There are none now.

### Fixed

- The OAuth token refresh, which threw before it could retry.
- `tasks.edit()` yielded `undefined`.
- `users.tasks()` could call back twice.
- `tasks.create()` and `tags.create()` changed the object they were given.
- An error response on a client without OAuth credentials threw outside the
  callback.

## [1.0.0] - 2015-07-23

### Added

- Refresh an expired OAuth token and retry on the first `401`.

### Changed

- Two-space indentation throughout.

## [0.3.0] - 2015-07-23

### Added

- `tasks.edit()`, `tasks.stories()` and `tasks.comment()`.
- `tasks.remove()`.

### Fixed

- Brought the tests and the code back in step.

## [0.2.1] - 2015-07-23

### Added

- Editing a task.

### Fixed

- Report more status codes as errors, and report a body that fails to parse.

## [0.2.0] - 2013-05-20

### Added

- Authenticate with an OAuth access token as well as an API key.
- Tags: `tags.list()`, `tags.get()`, `tags.tasks()`, `tags.create()` and
  `tags.update()`.

## [0.1.2] - 2012-11-29

### Added

- A `proxy` option.

### Changed

- `tasks.create()` accepts a null project.

## [0.1.1] - 2012-08-16

### Added

- `tasks.create()`.
- A LICENSE file.

### Fixed

- A task's `due_on` may be null.

## [0.1.0] - 2012-06-16

### Added

- List users, workspaces, projects and tasks.
- `users.tasks()` collects a user's tasks across workspaces.
