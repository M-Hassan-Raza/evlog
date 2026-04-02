<script setup lang="ts">
const frameworks = [
  {
    label: 'Nuxt',
    slot: 'nuxt' as const,
    code: `export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  log.set({ cart: { items: 3, total: 9999 } })
  return { ok: true }
})`,
  },
  {
    label: 'Express',
    slot: 'express' as const,
    code: `app.post('/api/checkout', (req, res) => {
  const log = useLogger(req)
  log.set({ cart: { items: 3, total: 9999 } })
  res.json({ ok: true })
})`,
  },
  {
    label: 'Hono',
    slot: 'hono' as const,
    code: `app.post('/api/checkout', (c) => {
  const log = c.get('log')
  log.set({ cart: { items: 3, total: 9999 } })
  return c.json({ ok: true })
})`,
  },
  {
    label: 'Fastify',
    slot: 'fastify' as const,
    code: `app.post('/api/checkout', async (request) => {
  request.log.set({ cart: { items: 3, total: 9999 } })
  return { ok: true }
})`,
  },
]
</script>

<template>
  <UTabs :items="frameworks.map(f => ({ label: f.label, slot: f.slot }))" class="mb-10">
    <template v-for="fw in frameworks" :key="fw.slot" #[fw.slot]>
      <pre class="framework-pre"><code>{{ fw.code }}</code></pre>
    </template>
  </UTabs>
</template>
