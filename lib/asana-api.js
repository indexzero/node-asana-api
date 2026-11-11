/*
 * asana-api.js: Top-level include for the `asana-api` module.
 *
 * (C) 2012 Charlie Robbins
 *
 */

import { AsanaError, Client } from './asana-api/client.js'

/**
 * @typedef {import('./asana-api/client.js').Callback} Callback
 * @typedef {import('./asana-api/client.js').ClientOptions} ClientOptions
 * @typedef {import('./asana-api/client.js').OAuthOptions} OAuthOptions
 * @typedef {import('./asana-api/client.js').Query} Query
 * @typedef {import('./asana-api/client.js').RequestOptions} RequestOptions
 */

/**
 * Creates a client for the Asana API.
 * @param {ClientOptions} options
 * @returns {Client}
 */
export function createClient(options) {
  return new Client(options)
}

export { AsanaError, Client }

export default { createClient, Client, AsanaError }
