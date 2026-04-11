---
'evlog': minor
---

Add `evlog/better-auth` integration for automatic user identification from [Better Auth](https://better-auth.com/) sessions.

**New exports** (`evlog/better-auth`):
- `identifyUser(log, session, options?)` — sets `userId`, `user`, and `session` fields on a wide event from a Better Auth session
- `createAuthIdentifier(auth, options?)` — Nitro `request` hook factory that auto-identifies users on every request (skips `/api/auth/**` by default)
- `createAuthMiddleware(auth, options?)` — framework-agnostic function `(log, headers) => Promise<void>` for Express, Hono, Fastify, etc.
- `maskEmail(email)` — utility to mask emails for safe logging (`h***@example.com`)

Options: `maskEmail`, `session` (include session metadata), `fields` (user field whitelist), `exclude`/`include` (route patterns for `createAuthIdentifier`).
