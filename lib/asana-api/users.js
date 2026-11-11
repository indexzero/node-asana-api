/*
 * users.js: Methods for the users resource.
 *
 * (C) 2012 Charlie Robbins.
 *
 */

import { settle, trailing } from './client.js'

/** @import { Callback, Client, Query } from './client.js' */

export class Users {
  /**
   * @param {Client} client
   */
  constructor(client) {
    this.client = client
  }

  /**
   * Gets one user, or lists users when called without an id.
   * @param {string | number | Query | Callback | null} [id]
   * @param {Query | Callback} [query]
   * @param {Callback} [callback]
   * @returns {Promise<any>}
   */
  get(id, query, callback) {
    if (typeof id === 'function' || (typeof id === 'object' && id !== null)) {
      return this.get(null, id, /** @type {Callback | undefined} */ (query))
    }

    const [params, done] = trailing(query, callback)
    return this.client.request({ path: id ? `/users/${id}` : '/users', query: params }, done)
  }

  /**
   * Lists the tasks assigned to a user in every workspace the client can see.
   * @param {string | number} id A user gid, or `me`.
   * @param {Callback} [callback]
   */
  tasks(id, callback) {
    return settle(this.#tasks(id), callback)
  }

  /**
   * @param {string | number} id
   */
  async #tasks(id) {
    const workspaces = await this.client.workspaces.list()
    const lists = await Promise.all(
      workspaces.map(async (/** @type {{ gid: string }} */ workspace) => {
        try {
          return await this.client.workspaces.tasks({ workspace: workspace.gid, assignee: id })
        } catch (err) {
          // A guest is listed in workspaces whose tasks they cannot query.
          const message = /** @type {any} */ (err)?.result?.errors?.[0]?.message
          if (/Not a user in workspace/.test(message)) return []
          throw err
        }
      })
    )
    return lists.flat()
  }

  /**
   * Gets the user the token belongs to.
   * @param {Query | Callback} [query]
   * @param {Callback} [callback]
   */
  me(query, callback) {
    return this.get('me', query, callback)
  }

  /**
   * Lists users. Asana wants a `workspace` or `team` in the query.
   * @param {Query | Callback} [query]
   * @param {Callback} [callback]
   */
  list(query, callback) {
    return this.get(null, query, callback)
  }
}
