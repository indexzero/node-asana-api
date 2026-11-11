/*
 * callbacks.cjs: The 1.x calling style, which still works.
 *
 *   ASANA_ACCESS_TOKEN=... node examples/callbacks.cjs
 */

const asana = require('asana-api')

const client = asana.createClient({
  token: process.env.ASANA_ACCESS_TOKEN,
  url: process.env.ASANA_API_URL
})

client.workspaces.list((err, workspaces) => {
  if (err) throw err

  console.log(`workspaces: ${workspaces.map(workspace => workspace.name).join(', ')}`)
})
