/*
 * asana-api.js: Top-level include for the `asana-api` module.
 *
 * (C) 2012 Charlie Robbins
 *
 */

import { AsanaError, Client } from './asana-api/client.js'

/**
 * Creates a client for the Asana API.
 * @param {import('./asana-api/client.js').ClientOptions} options
 * @returns {Client}
 */
export function createClient(options) {
  return new Client(options)
}

export { AsanaError, Client }

export default { createClient, Client, AsanaError }
