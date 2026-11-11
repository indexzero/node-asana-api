/*
 * tags.js: Methods for the tags resource.
 *
 * (C) 2012 Charlie Robbins.
 *
 */

import { trailing } from './client.js'

/** @import { Callback, Client, Query } from './client.js' */

export class Tags {
  /**
   * @param {Client} client
   */
  constructor(client) {
    this.client = client
  }

  /**
   * Lists tags. Asana wants a `workspace` in the query.
   * @param {Query | Callback} [query]
   * @param {Callback} [callback]
   */
  list(query, callback) {
    const [params, done] = trailing(query, callback)
    return this.client.request({ path: '/tags', query: params }, done)
  }

  /**
   * @param {string | number} tag
   * @param {Query | Callback} [query]
   * @param {Callback} [callback]
   */
  get(tag, query, callback) {
    const [params, done] = trailing(query, callback)
    return this.client.request({ path: `/tags/${tag}`, query: params }, done)
  }

  /**
   * Lists the tasks that carry a tag.
   * @param {string | number} tag
   * @param {Query | Callback} [query]
   * @param {Callback} [callback]
   */
  tasks(tag, query, callback) {
    const [params, done] = trailing(query, callback)
    return this.client.request({ path: `/tags/${tag}/tasks`, query: params }, done)
  }

  /**
   * Creates a tag in a workspace.
   * @param {string | number} workspace
   * @param {Record<string, unknown>} data The tag, such as `{ name }`.
   * @param {Callback} [callback]
   */
  create(workspace, data, callback) {
    return this.client.request(
      { method: 'POST', path: '/tags', body: { data: { ...data, workspace } } },
      callback
    )
  }

  /**
   * @param {string | number} tag
   * @param {Record<string, unknown>} data
   * @param {Callback} [callback]
   */
  update(tag, data, callback) {
    return this.client.request({ method: 'PUT', path: `/tags/${tag}`, body: { data } }, callback)
  }
}
