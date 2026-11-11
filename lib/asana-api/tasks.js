/*
 * tasks.js: Methods for the tasks resource.
 *
 * (C) 2012 Charlie Robbins.
 *
 */

import { AsanaError, settle, trailing } from './client.js'

/** @import { Callback, Client, Query } from './client.js' */

export class Tasks {
  /**
   * @param {Client} client
   */
  constructor(client) {
    this.client = client
  }

  /**
   * @param {string | number} task
   * @param {Query | Callback} [query]
   * @param {Callback} [callback]
   */
  get(task, query, callback) {
    const [params, done] = trailing(query, callback)
    return this.client.request({ path: `/tasks/${task}`, query: params }, done)
  }

  /**
   * Creates a task in a workspace and adds it to the given projects. If
   * adding it to a project fails, the error carries the new task as `task`.
   * @param {string | number} workspace
   * @param {string | number | Array<string | number> | null | undefined} project
   *   One project, several, or none.
   * @param {object} data The task, such as `{ name, notes }`.
   * @param {Callback} [callback]
   */
  create(workspace, project, data, callback) {
    return settle(this.#create(workspace, project, data), callback)
  }

  /**
   * @param {string | number} workspace
   * @param {string | number | Array<string | number> | null | undefined} project
   * @param {object} data
   */
  async #create(workspace, project, data) {
    const task = await this.client.request({
      method: 'POST',
      path: '/tasks',
      body: { data: { ...data, workspace } }
    })

    if (!task?.gid) {
      throw new AsanaError('Asana Error: the response to creating a task had no gid', {
        result: task
      })
    }

    const projects = project ? [project].flat() : []
    for (const id of projects) {
      try {
        await this.client.request({
          method: 'POST',
          path: `/tasks/${task.gid}/addProject`,
          body: { data: { project: id } }
        })
      } catch (err) {
        // The task exists by now. Say which one, so the caller can keep it
        // or clean it up.
        if (err instanceof AsanaError) err.task = task
        throw err
      }
    }

    return task
  }

  /**
   * @param {string | number} task
   * @param {object} data
   * @param {Callback} [callback]
   */
  edit(task, data, callback) {
    return this.client.request({ method: 'PUT', path: `/tasks/${task}`, body: { data } }, callback)
  }

  /**
   * Lists the stories (comments and history) of a task.
   * @param {string | number} task
   * @param {Query | Callback} [query]
   * @param {Callback} [callback]
   */
  stories(task, query, callback) {
    const [params, done] = trailing(query, callback)
    return this.client.request({ path: `/tasks/${task}/stories`, query: params }, done)
  }

  /**
   * Adds a comment to a task.
   * @param {string | number} task
   * @param {string} text
   * @param {Callback} [callback]
   */
  comment(task, text, callback) {
    return this.client.request(
      { method: 'POST', path: `/tasks/${task}/stories`, body: { data: { text } } },
      callback
    )
  }

  /**
   * Deletes a task.
   * @param {string | number} task
   * @param {Callback} [callback]
   */
  remove(task, callback) {
    return this.client.request({ method: 'DELETE', path: `/tasks/${task}` }, callback)
  }
}
