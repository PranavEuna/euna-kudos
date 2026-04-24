import { createMiddleware } from 'hono/factory'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users, type User } from '../db/schema.js'

type AuthUser = Pick<User, 'id' | 'email' | 'name'> & { groups: string[] }

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
  }
}

export const ALLOWED_EMAIL_DOMAIN = 'eunasolutions.com'

function isAllowedEmail(email: string): boolean {
  return email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
}

const JWKS = process.env.ACCESS_TEAM_DOMAIN
  ? createRemoteJWKSet(
      new URL(`https://${process.env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`)
    )
  : null

export const requireAuth = createMiddleware(async (c, next) => {
  // Idempotent: skip if already set
  if (c.get('user')) return next()

  let email: string
  let name: string
  let groups: string[] = []

  if (process.env.AUTH_MODE === 'local_mock') {
    // Hard refusal in production regardless of AUTH_MODE value
    if (process.env.NODE_ENV === 'production') {
      return c.json({ error: 'misconfiguration' }, 500)
    }

    const devEmail = c.req.header('X-Dev-User-Email')
    if (!devEmail || !devEmail.includes('@')) {
      return c.json({ error: 'unauthenticated' }, 401)
    }
    email = devEmail.toLowerCase().trim()
    if (!isAllowedEmail(email)) {
      return c.json(
        { error: 'forbidden_domain', message: `Sign-in is restricted to @${ALLOWED_EMAIL_DOMAIN} emails.` },
        403
      )
    }
    name = email.split('@')[0]
    // Local dev shortcut: any email containing "admin" gets the app-admins group.
    // Matches the prod access-model: admin status is derived from JWT groups.
    if (email.includes('admin')) groups = ['app-admins']
  } else {
    // Production path — X-Dev-User-Email is an attack or bug
    if (c.req.header('X-Dev-User-Email')) {
      return c.json({ error: 'invalid request' }, 400)
    }

    const token = c.req.header('Cf-Access-Jwt-Assertion')
    if (!token || !JWKS) {
      return c.json({ error: 'unauthenticated' }, 401)
    }

    try {
      const { payload } = await jwtVerify(token, JWKS, {
        audience: process.env.ACCESS_AUD,
        issuer: `https://${process.env.ACCESS_TEAM_DOMAIN}`,
      })
      email = (payload.email as string).toLowerCase().trim()
      if (!isAllowedEmail(email)) {
        return c.json(
          { error: 'forbidden_domain', message: `Sign-in is restricted to @${ALLOWED_EMAIL_DOMAIN} emails.` },
          403
        )
      }
      name = ((payload.name as string) ?? email.split('@')[0])
      groups = ((payload.custom as any)?.groups ?? []) as string[]
    } catch {
      return c.json({ error: 'invalid token' }, 401)
    }
  }

  // JIT provisioning — same code path in both modes
  let user = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!user) {
    try {
      const [inserted] = await db.insert(users).values({ email, name }).returning()
      user = inserted
    } catch (e) {
      // Handle concurrent first-request race on unique constraint
      user = await db.query.users.findFirst({ where: eq(users.email, email) })
      if (!user) throw e
    }
  }

  c.set('user', {
    id: user.id,
    email: user.email,
    name: user.name,
    groups,
  })
  await next()
})
