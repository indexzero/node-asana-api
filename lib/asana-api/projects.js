/*
 * projects.js: Methods for the projects resource.
 *
 * (C) 2012 Charlie Robbins.
 *
 */

import { trailing } from './client.js'

/** @import { Callback, Client, Query } from './client.js' */

export class Projects {
  /**
   * @param {Client} client
   */
  constructor(client) {
    this.client = client
  }

  /**
   * Lists projects. Asana wants a `workspace` or `team` in the query.
   * @param {Query | Callback} [query]
   * @param {Callback} [callback]
   */
  list(query, callback) {
    const [params, done] = trailing(query, callback)
    return this.client.request({ path: '/projects', query: params }, done)
  }

  /**
   * Lists the tasks in a project.
   * @param {string | number} project
   * @param {Query | Callback} [query]
   * @param {Callback} [callback]
   */
  tasks(project, query, callback) {
    const [params, done] = trailing(query, callback)
    return this.client.request({ path: `/projects/${project}/tasks`, query: params }, done)
  }
}
