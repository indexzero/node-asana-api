/*
 * check-pack.mjs: Checks that the tarball contains every file package.json
 * points at.
 *
 * `files` is an allowlist. One that misses a directory publishes a package
 * that fails at import, or one whose types do not resolve, and nothing else
 * notices until someone installs it.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url)
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))

/** @type {Set<string>} */
const targets = new Set([pkg.main, pkg.types])

/** @param {unknown} node */
function collect(node) {
  if (typeof node === 'string') targets.add(node)
  else if (node && typeof node === 'object') Object.values(node).forEach(collect)
}
collect(pkg.exports)

// --ignore-scripts: this reads what is on disk. `check` builds dist/ first.
const output = JSON.parse(
  execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  })
)
// npm 11 and earlier print an array. npm 12 prints an object keyed by name.
const packed = Array.isArray(output) ? output[0] : Object.values(output)[0]
const shipped = new Set(packed.files.map((/** @type {{ path: string }} */ file) => file.path))

const missing = [...targets]
  .map(target => target.replace(/^\.\//, ''))
  .filter(target => !shipped.has(target))

if (missing.length) {
  console.error(`check-pack: package.json points at files the tarball lacks: ${missing.join(', ')}`)
  process.exit(1)
}

console.log(`check-pack: ${shipped.size} files, every entry point present`)
