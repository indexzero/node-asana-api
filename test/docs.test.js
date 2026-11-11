/*
 * docs.test.js: Checks that the documentation still describes this repository.
 *
 * (C) 2012 Charlie Robbins
 *
 * Each check is narrow on purpose. The obvious broad check, parsing every
 * fenced block as a module, fails on correct documentation: a block showing
 * two spellings of one binding redeclares it, and a fragment has a bare
 * `return`. A gate that fails on correct input gets switched off, so every
 * check here is one that cannot.
 */

import { strict as assert } from 'node:assert'
import { existsSync, globSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const root = path.join(import.meta.dirname, '..')

// Which documents to check.
const DOC_GLOBS = ['*.md']

// Top-level directories whose paths the documents may name in backticks.
// Only the ones that exist are used.
const CODE_DIRS = ['lib', 'test', 'examples']

const read = file => readFileSync(path.join(root, file), 'utf8')
const docs = globSync(DOC_GLOBS, { cwd: root }).sort()
const pkg = JSON.parse(read('package.json'))
const dirs = CODE_DIRS.filter(dir => existsSync(path.join(root, dir)))

describe('documentation', () => {
  it('finds the documents it means to check', () => {
    // Without this, a wrong glob makes every check below pass on nothing.
    assert(docs.includes('README.md'), `found only: ${docs.join(', ') || 'nothing'}`)
  })

  it('references only repository paths that exist', () => {
    const pattern = new RegExp(`\`((?:${dirs.join('|')})/[A-Za-z0-9_.*/-]+)\``, 'g')
    const missing = []
    for (const file of docs) {
      for (const [, ref] of read(file).matchAll(pattern)) {
        if (!globSync(ref, { cwd: root }).length) missing.push(`${file} -> ${ref}`)
      }
    }
    assert.deepEqual(missing, [])
  })

  it('references only package scripts that exist', () => {
    const missing = []
    for (const file of docs) {
      for (const [, script] of read(file).matchAll(
        /(?:pnpm|npm|yarn|bun) run ([a-z][a-z0-9:_-]*)/g
      )) {
        if (!(script in (pkg.scripts ?? {}))) missing.push(`${file} -> ${script}`)
      }
    }
    assert.deepEqual(missing, [])
  })

  it('has no duplicate specifiers in an import list', () => {
    // A pasted example with a repeated name is a SyntaxError for the reader.
    const duplicated = []
    for (const file of docs) {
      for (const [, list] of read(file).matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
        const seen = new Set()
        for (const raw of list.split(',')) {
          const name = raw
            .trim()
            .split(/\s+as\s+/)
            .pop()
          if (!name) continue
          if (seen.has(name)) duplicated.push(`${file} -> ${name}`)
          seen.add(name)
        }
      }
    }
    assert.deepEqual(duplicated, [])
  })

  it('states the Node.js floor the same way everywhere', () => {
    // The floor lives in package.json. Prose that names a different one is
    // the first thing to go stale.
    const floor = pkg.engines.node.match(/\d+/)?.[0]
    const wrong = []
    for (const file of docs) {
      for (const [match, version] of read(file).matchAll(
        /Node\.js (\d+)(?= or later| is the minimum)/g
      )) {
        if (version !== floor) wrong.push(`${file} -> ${match}`)
      }
    }
    assert.deepEqual(wrong, [])
    assert.match(read('README.md'), new RegExp(`Node\\.js ${floor} or later`))
  })

  it('states no test, example, or error counts', () => {
    // A count in prose is state that nothing recomputes. It belongs in the
    // output of the command that computes it.
    const stale = []
    for (const file of docs) {
      for (const [match] of read(file).matchAll(
        /\b\d{2,5}\s+(?:unit\s+|passing\s+)?(?:tests?|examples?|errors?)\b/g
      )) {
        stale.push(`${file} -> ${match}`)
      }
    }
    assert.deepEqual(stale, [])
  })
})
