/*
 * errors.js: What a failed request looks like.
 *
 *   ASANA_ACCESS_TOKEN=... node examples/errors.js
 */

import { AsanaError, createClient } from 'asana-api'

const client = createClient({
  token: process.env.ASANA_ACCESS_TOKEN,
  url: process.env.ASANA_API_URL
})

try {
  await client.tasks.get('0')
} catch (err) {
  if (!(err instanceof AsanaError)) throw err

  console.log(`${err.status}: ${err.message}`)
  console.log(err.result?.errors?.[0]?.message)
}
