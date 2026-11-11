/*
 * workspaces.js: Methods for the workspaces resource.
 *
 * (C) 2012 Charlie Robbins.
 *
 */

import { trailing } from './client.js'

/** @import { Callback, Client, Query } from './client.js' */

export class Workspaces {
  /**
   * @param {Client} client
   */
  constructor(client) {
    this.client = client
  }

  /**
   * Lists the workspaces the client can see.
   * @param {Query | Callback} [query]
   * @param {Callback} [callback]
   */
  list(query, callback) {
    const [params, done] = trailing(query, callback)
    return this.client.request({ path: '/workspaces', query: params }, done)
  }

  /**
   * Searches tasks. Asana wants a `workspace` and an `assignee`, or a
   * `project`, `tag`, or `section`.
   * @param {Query} query
   * @param {Callback} [callback]
   */
  tasks(query, callback) {
    return this.client.request({ path: '/tasks', query }, callback)
  }

  /**
   * Lists the projects in a workspace.
   * @param {string | number} workspace
   * @param {Query | Callback} [query]
   * @param {Callback} [callback]
   */
  projects(workspace, query, callback) {
    const [params, done] = trailing(query, callback)
    return this.client.request({ path: `/workspaces/${workspace}/projects`, query: params }, done)
  }

  /**
   * Lists the teams in a workspace.
   * @param {string | number} workspace
   * @param {Query | Callback} [query]
   * @param {Callback} [callback]
   */
  teams(workspace, query, callback) {
    const [params, done] = trailing(query, callback)
    return this.client.request({ path: `/workspaces/${workspace}/teams`, query: params }, done)
  }
}
