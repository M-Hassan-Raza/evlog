import type { RequestLogger } from '../types'
import { matchesPattern } from '../utils'

/**
 * User fields extracted from a Better Auth session.
 */
export interface AuthUserData {
  id: string
  name?: string
  email?: string
  image?: string
  emailVerified?: boolean
  createdAt?: string
}

/**
 * Session fields extracted from a Better Auth session.
 */
export interface AuthSessionData {
  id: string
  expiresAt?: string
  ipAddress?: string
  createdAt?: string
}

/**
 * Options for `identifyUser`.
 */
export interface IdentifyOptions {
  /**
   * Whether to mask the user email (e.g. `h***@domain.com`).
   * @default false
   */
  maskEmail?: boolean
  /**
   * Whether to include session metadata on the wide event.
   * @default true
   */
  session?: boolean
  /**
   * Whitelist of user fields to include.
   * @default ['id', 'name', 'email', 'image', 'emailVerified', 'createdAt']
   */
  fields?: string[]
}

/**
 * Options for `createAuthIdentifier`.
 */
export interface AuthIdentifierOptions extends IdentifyOptions {
  /**
   * Route patterns to skip session resolution (glob).
   * @default ['/api/auth/**']
   */
  exclude?: string[]
  /**
   * Route patterns to apply session resolution (glob).
   * If set, only matching routes are resolved.
   */
  include?: string[]
}

const DEFAULT_USER_FIELDS = ['id', 'name', 'email', 'image', 'emailVerified', 'createdAt']

/**
 * Mask an email address for safe logging: `hugo@example.com` -> `h***@example.com`.
 */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@')
  if (atIndex <= 0) return '***'
  return `${email[0]}***${email.slice(atIndex)}`
}

function extractUserData(
  user: Record<string, unknown>,
  options?: IdentifyOptions,
): AuthUserData {
  const fields = options?.fields ?? DEFAULT_USER_FIELDS
  const data: Record<string, unknown> = {}

  for (const field of fields) {
    const value = user[field]
    if (value === undefined || value === null) continue

    if (field === 'email' && options?.maskEmail && typeof value === 'string') {
      data[field] = maskEmail(value)
    } else if (field === 'createdAt' && value instanceof Date) {
      data[field] = value.toISOString()
    } else {
      data[field] = value
    }
  }

  return data as unknown as AuthUserData
}

function extractSessionData(
  session: Record<string, unknown>,
): AuthSessionData {
  const data: AuthSessionData = { id: String(session.id) }

  if (session.expiresAt) {
    data.expiresAt = session.expiresAt instanceof Date
      ? session.expiresAt.toISOString()
      : String(session.expiresAt)
  }
  if (typeof session.ipAddress === 'string') data.ipAddress = session.ipAddress
  if (session.createdAt) {
    data.createdAt = session.createdAt instanceof Date
      ? session.createdAt.toISOString()
      : String(session.createdAt)
  }

  return data
}

/**
 * Identify a user on a wide event from a Better Auth session result.
 *
 * Sets `userId`, `user`, and optionally `session` fields on the logger.
 * Safe by default — only extracts whitelisted fields and never logs passwords or tokens.
 *
 * @example
 * ```ts
 * import { identifyUser } from 'evlog/better-auth'
 *
 * const session = await auth.api.getSession({ headers: event.headers })
 * if (session) {
 *   identifyUser(log, session)
 * }
 * ```
 *
 * @example With email masking
 * ```ts
 * identifyUser(log, session, { maskEmail: true })
 * // user.email → "h***@example.com"
 * ```
 */
export function identifyUser(
  log: RequestLogger,
  session: { user: Record<string, unknown>, session: Record<string, unknown> },
  options?: IdentifyOptions,
): void {
  const user = extractUserData(session.user, options)
  const includeSession = options?.session !== false

  log.set({
    userId: user.id,
    user,
    ...(includeSession ? { session: extractSessionData(session.session) } : {}),
  } as Record<string, unknown>)
}

/**
 * Create an async function that resolves a Better Auth session from headers
 * and identifies the user on the logger.
 *
 * Works with any framework — just pass the auth instance and call the returned
 * function with a logger and headers.
 *
 * @example Hono
 * ```ts
 * import { createAuthMiddleware } from 'evlog/better-auth'
 *
 * const identify = createAuthMiddleware(auth)
 *
 * app.get('/api/users', async (c) => {
 *   const log = c.get('log')
 *   await identify(log, c.req.raw.headers)
 *   log.set({ users: { count: 42 } })
 *   return c.json({ users: [] })
 * })
 * ```
 *
 * @example Express
 * ```ts
 * const identify = createAuthMiddleware(auth, { maskEmail: true })
 *
 * app.use(async (req, res, next) => {
 *   await identify(req.log, req.headers)
 *   next()
 * })
 * ```
 */
export function createAuthMiddleware(
  auth: { api: { getSession: (opts: { headers: Headers | Record<string, string | string[] | undefined> }) => Promise<{ user: Record<string, unknown>, session: Record<string, unknown> } | null> } },
  options?: IdentifyOptions,
): (log: RequestLogger, headers: Headers | Record<string, string | string[] | undefined>) => Promise<void> {
  return async (log, headers) => {
    try {
      const session = await auth.api.getSession({ headers })
      if (session) {
        identifyUser(log, session, options)
      }
    } catch {
      // Session resolution should never break the request
    }
  }
}

function shouldResolve(path: string, options?: AuthIdentifierOptions): boolean {
  const exclude = options?.exclude ?? ['/api/auth/**']
  for (const pattern of exclude) {
    if (matchesPattern(path, pattern)) return false
  }

  if (options?.include) {
    for (const pattern of options.include) {
      if (matchesPattern(path, pattern)) return true
    }
    return false
  }

  return true
}

/**
 * Create a Nitro `request` hook that auto-identifies users from Better Auth sessions.
 *
 * Resolves the session from request cookies on every request and sets user/session
 * context on the evlog logger. Skips `/api/auth/**` by default to avoid resolving
 * sessions during auth flows.
 *
 * @example
 * ```ts
 * // server/plugins/evlog-auth.ts
 * import { createAuthIdentifier } from 'evlog/better-auth'
 * import { auth } from '~/lib/auth'
 *
 * export default defineNitroPlugin((nitroApp) => {
 *   nitroApp.hooks.hook('request', createAuthIdentifier(auth))
 * })
 * ```
 *
 * @example With options
 * ```ts
 * nitroApp.hooks.hook('request', createAuthIdentifier(auth, {
 *   maskEmail: true,
 *   exclude: ['/api/auth/**', '/api/public/**'],
 * }))
 * ```
 */
export function createAuthIdentifier(
  auth: { api: { getSession: (opts: { headers: Headers | Record<string, string | string[] | undefined> }) => Promise<{ user: Record<string, unknown>, session: Record<string, unknown> } | null> } },
  options?: AuthIdentifierOptions,
): (event: { path: string, headers: Headers | { get(name: string): string | null }, context: { log?: RequestLogger } }) => Promise<void> {
  return async (event) => {
    if (!shouldResolve(event.path, options)) return
    if (!event.context.log) return

    try {
      const { headers } = event
      const session = await auth.api.getSession({ headers: headers as Headers })
      if (session) {
        identifyUser(event.context.log, session, options)
      }
    } catch {
      // Session resolution should never break the request
    }
  }
}
