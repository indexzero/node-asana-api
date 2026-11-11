/*
 * whoami.js: Print the user a token belongs to.
 *
 *   ASANA_ACCESS_TOKEN=... node examples/whoami.js
 */

import { createClient } from 'asana-api'

const client = createClient({
  token: process.env.ASANA_ACCESS_TOKEN,
  url: process.env.ASANA_API_URL
})

const me = await client.users.me({ opt_fields: 'name,email' })

console.log(`${me.name} <${me.email}>`)
