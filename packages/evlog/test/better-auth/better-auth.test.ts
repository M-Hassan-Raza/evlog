import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RequestLogger } from '../../src/types'
import {
  createAuthIdentifier,
  createAuthMiddleware,
  identifyUser,
  maskEmail,
} from '../../src/better-auth'

function createMockLogger(): RequestLogger & { setCalls: Array<Record<string, unknown>> } {
  const setCalls: Array<Record<string, unknown>> = []
  return {
    setCalls,
    set: vi.fn((data: Record<string, unknown>) => {
      setCalls.push(structuredClone(data))
    }),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    emit: vi.fn(() => null),
    getContext: vi.fn(() => ({})),
  }
}

function createMockSession(overrides?: {
  user?: Partial<Record<string, unknown>>
  session?: Partial<Record<string, unknown>>
}) {
  return {
    user: {
      id: 'usr_123',
      name: 'Hugo Richard',
      email: 'hugo@example.com',
      image: 'https://example.com/avatar.png',
      emailVerified: true,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      ...overrides?.user,
    },
    session: {
      id: 'sess_abc',
      expiresAt: new Date('2024-01-22T10:00:00Z'),
      ipAddress: '192.168.1.1',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      token: 'secret_token_value',
      userId: 'usr_123',
      userAgent: 'Mozilla/5.0',
      ...overrides?.session,
    },
  }
}

function createMockAuth(session: ReturnType<typeof createMockSession> | null = createMockSession()) {
  return {
    api: {
      getSession: vi.fn(async () => session),
    },
  }
}

describe('maskEmail', () => {
  it('masks a standard email', () => {
    expect(maskEmail('hugo@example.com')).toBe('h***@example.com')
  })

  it('handles single-char local part', () => {
    expect(maskEmail('a@b.com')).toBe('a***@b.com')
  })

  it('handles missing @ symbol', () => {
    expect(maskEmail('noemail')).toBe('***')
  })
})

describe('identifyUser', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sets userId, user, and session on the logger', () => {
    const log = createMockLogger()
    const session = createMockSession()

    identifyUser(log, session)

    expect(log.set).toHaveBeenCalledOnce()
    const call = log.setCalls[0]

    expect(call.userId).toBe('usr_123')

    const user = call.user as Record<string, unknown>
    expect(user.id).toBe('usr_123')
    expect(user.name).toBe('Hugo Richard')
    expect(user.email).toBe('hugo@example.com')
    expect(user.image).toBe('https://example.com/avatar.png')
    expect(user.emailVerified).toBe(true)
    expect(user.createdAt).toBe('2024-01-15T10:00:00.000Z')

    const sess = call.session as Record<string, unknown>
    expect(sess.id).toBe('sess_abc')
    expect(sess.expiresAt).toBe('2024-01-22T10:00:00.000Z')
    expect(sess.ipAddress).toBe('192.168.1.1')
  })

  it('does not include session token or userId in session data', () => {
    const log = createMockLogger()
    identifyUser(log, createMockSession())

    const sess = log.setCalls[0].session as Record<string, unknown>
    expect(sess.token).toBeUndefined()
    expect(sess.userId).toBeUndefined()
    expect(sess.userAgent).toBeUndefined()
  })

  it('masks email when maskEmail option is true', () => {
    const log = createMockLogger()
    identifyUser(log, createMockSession(), { maskEmail: true })

    const user = log.setCalls[0].user as Record<string, unknown>
    expect(user.email).toBe('h***@example.com')
  })

  it('excludes session when session option is false', () => {
    const log = createMockLogger()
    identifyUser(log, createMockSession(), { session: false })

    expect(log.setCalls[0].session).toBeUndefined()
    expect(log.setCalls[0].userId).toBe('usr_123')
    expect(log.setCalls[0].user).toBeDefined()
  })

  it('respects custom fields whitelist', () => {
    const log = createMockLogger()
    identifyUser(log, createMockSession(), { fields: ['id', 'name'] })

    const user = log.setCalls[0].user as Record<string, unknown>
    expect(user.id).toBe('usr_123')
    expect(user.name).toBe('Hugo Richard')
    expect(user.email).toBeUndefined()
    expect(user.image).toBeUndefined()
    expect(user.emailVerified).toBeUndefined()
  })

  it('handles string dates in session', () => {
    const log = createMockLogger()
    const session = createMockSession({
      session: {
        expiresAt: '2024-01-22T10:00:00Z',
        createdAt: '2024-01-15T10:00:00Z',
      },
    })

    identifyUser(log, session)

    const sess = log.setCalls[0].session as Record<string, unknown>
    expect(sess.expiresAt).toBe('2024-01-22T10:00:00Z')
  })

  it('handles missing optional user fields', () => {
    const log = createMockLogger()
    const session = createMockSession({
      user: { id: 'usr_456', name: undefined, email: undefined, image: undefined },
    })

    identifyUser(log, session)

    const user = log.setCalls[0].user as Record<string, unknown>
    expect(user.id).toBe('usr_456')
    expect(user.name).toBeUndefined()
    expect(user.email).toBeUndefined()
  })
})

describe('createAuthMiddleware', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves session and identifies user', async () => {
    const log = createMockLogger()
    const auth = createMockAuth()
    const identify = createAuthMiddleware(auth)

    await identify(log, new Headers({ cookie: 'session=abc' }))

    expect(auth.api.getSession).toHaveBeenCalledOnce()
    expect(log.set).toHaveBeenCalledOnce()
    expect(log.setCalls[0].userId).toBe('usr_123')
  })

  it('does nothing when session is null', async () => {
    const log = createMockLogger()
    const auth = createMockAuth(null)
    const identify = createAuthMiddleware(auth)

    await identify(log, new Headers())

    expect(log.set).not.toHaveBeenCalled()
  })

  it('catches errors silently', async () => {
    const log = createMockLogger()
    const auth = {
      api: {
        getSession: vi.fn(async () => { throw new Error('DB connection failed') }),
      },
    }
    const identify = createAuthMiddleware(auth)

    await expect(identify(log, new Headers())).resolves.toBeUndefined()
    expect(log.set).not.toHaveBeenCalled()
  })

  it('passes identify options through', async () => {
    const log = createMockLogger()
    const auth = createMockAuth()
    const identify = createAuthMiddleware(auth, { maskEmail: true, session: false })

    await identify(log, new Headers())

    const user = log.setCalls[0].user as Record<string, unknown>
    expect(user.email).toBe('h***@example.com')
    expect(log.setCalls[0].session).toBeUndefined()
  })
})

describe('createAuthIdentifier', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function createMockEvent(path: string, log?: RequestLogger) {
    return {
      path,
      headers: new Headers({ cookie: 'session=abc' }),
      context: { log },
    }
  }

  it('identifies user on a regular API request', async () => {
    const log = createMockLogger()
    const auth = createMockAuth()
    const hook = createAuthIdentifier(auth)

    await hook(createMockEvent('/api/users', log))

    expect(log.setCalls[0].userId).toBe('usr_123')
  })

  it('skips /api/auth/** by default', async () => {
    const log = createMockLogger()
    const auth = createMockAuth()
    const hook = createAuthIdentifier(auth)

    await hook(createMockEvent('/api/auth/sign-in/email', log))

    expect(auth.api.getSession).not.toHaveBeenCalled()
    expect(log.set).not.toHaveBeenCalled()
  })

  it('skips when no logger on context', async () => {
    const auth = createMockAuth()
    const hook = createAuthIdentifier(auth)

    await hook(createMockEvent('/api/users'))

    expect(auth.api.getSession).not.toHaveBeenCalled()
  })

  it('respects custom exclude patterns', async () => {
    const log = createMockLogger()
    const auth = createMockAuth()
    const hook = createAuthIdentifier(auth, { exclude: ['/api/public/**'] })

    await hook(createMockEvent('/api/public/health', log))
    expect(auth.api.getSession).not.toHaveBeenCalled()

    await hook(createMockEvent('/api/auth/sign-in/email', log))
    expect(auth.api.getSession).toHaveBeenCalled()
  })

  it('respects include patterns', async () => {
    const log = createMockLogger()
    const auth = createMockAuth()
    const hook = createAuthIdentifier(auth, {
      exclude: [],
      include: ['/api/protected/**'],
    })

    await hook(createMockEvent('/api/public/health', log))
    expect(auth.api.getSession).not.toHaveBeenCalled()

    await hook(createMockEvent('/api/protected/dashboard', log))
    expect(auth.api.getSession).toHaveBeenCalled()
  })

  it('catches errors silently', async () => {
    const log = createMockLogger()
    const auth = {
      api: {
        getSession: vi.fn(async () => { throw new Error('DB error') }),
      },
    }
    const hook = createAuthIdentifier(auth)

    await expect(hook(createMockEvent('/api/users', log))).resolves.toBeUndefined()
  })
})
