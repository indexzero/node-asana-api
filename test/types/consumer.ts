/*
 * consumer.ts: What a TypeScript caller can and cannot write.
 *
 * Never run. `pnpm run check:types` compiles it against the declarations in
 * dist/, resolved by package name, so it fails when the generated types stop
 * describing the package.
 */

import asana, { AsanaError, type Client, type ClientOptions, createClient } from 'asana-api'

const options: ClientOptions = { token: 't', url: 'http://localhost' }
const client: Client = createClient(options)
const same: Client = asana.createClient({ oauth: { accessToken: 'a', refreshToken: 'r' } })

export async function reads(): Promise<void> {
  const me = await client.users.me({ opt_fields: 'name' })
  const tasks = await client.projects.tasks('9')
  for await (const task of client.pages('/tasks')) void task
  void [me, tasks, same]
}

export function callbacks(): void {
  client.users.me((err, user) => void [err, user])
  client.tags.list({ workspace: '7' }, (err, tags) => void [err, tags])
}

export function errors(err: unknown): number | undefined {
  return err instanceof AsanaError ? err.status : undefined
}

// @ts-expect-error a client option that does not exist
createClient({ tokne: 't' })

// @ts-expect-error a path is required
client.request({ method: 'GET' })

// @ts-expect-error the comment text must be a string
client.tasks.comment('5', 42)

// @ts-expect-error there is no such resource
client.portfolios
