/**
 * vaul-vue lists `vue` as a dependency, so installers nest a second copy under
 * `vaul-vue/node_modules/vue`. Node SSR loads that copy and breaks the app
 * runtime (renderSlot / `.ce`). Remove the nested tree so resolution uses the
 * hoisted `vue` at the repo root. Runs after every `bun install` (incl. Vercel).
 */
import { existsSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const nestedVue = join(root, 'node_modules', 'vaul-vue', 'node_modules', 'vue')

if (existsSync(nestedVue)) {
  rmSync(nestedVue, { recursive: true, force: true })
  console.log('[dedupe-vaul-vue] removed nested vue:', nestedVue)
}
