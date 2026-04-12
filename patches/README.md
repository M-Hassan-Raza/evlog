# Dependency patches (Bun)

## `vaul-vue@0.4.1`

`vaul-vue` lists `vue` as a **dependency**, so installers nest a second copy under `vaul-vue/node_modules/vue`. That breaks Nuxt SSR (duplicate Vue runtime, `renderSlot` / `.ce`).

The patch removes `vue` from `dependencies` (it stays in `peerDependencies`). Tracked via `patchedDependencies` in the root `package.json`. See [Bun patch](https://bun.sh/docs/install/patch).

When upgrading `vaul-vue`, refresh or drop this patch if upstream fixes the manifest.
