/*
 * pages.js: Walk every task in a project, however many pages it takes.
 *
 *   ASANA_ACCESS_TOKEN=... node examples/pages.js <project-gid>
 */

import { createClient } from 'asana-api'

const client = createClient({
  token: process.env.ASANA_ACCESS_TOKEN,
  url: process.env.ASANA_API_URL
})

const project = process.argv[2]
let count = 0

for await (const task of client.pages(`/projects/${project}/tasks`)) {
  count += 1
  console.log(`${task.gid} ${task.name}`)
}

console.log(`${count} tasks`)
