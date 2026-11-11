/*
 * clean.mjs: Removes dist/ before the declarations are built, so a
 * declaration for a module that no longer exists is never published.
 */

import { rmSync } from 'node:fs'

rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true })
