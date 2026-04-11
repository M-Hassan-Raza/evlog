import { createAuthMiddleware } from 'evlog/better-auth'

const identify = createAuthMiddleware(auth)

export default defineEventHandler(async (event) => {
  if (event.path.startsWith('/api/auth/')) return
  if (!event.context.log) return

  await identify(event.context.log, event.headers)
})
