import { Hono } from 'hono'
import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { comments, kudos, users } from '../db/schema.js'

// Mounted under /api/kudos/:kudosId/comments
export const commentsRoute = new Hono<{ Variables: { kudosId: string } }>()

const createSchema = z.object({
  body: z.string().trim().min(1).max(500),
})

async function assertKudosExists(kudosId: string): Promise<boolean> {
  const [row] = await db.select({ id: kudos.id }).from(kudos).where(eq(kudos.id, kudosId)).limit(1)
  return Boolean(row)
}

// GET /api/kudos/:kudosId/comments
commentsRoute.get('/', async (c) => {
  const kudosId = c.req.param('kudosId')!
  if (!z.string().uuid().safeParse(kudosId).success) {
    return c.json({ error: 'invalid id' }, 400)
  }
  if (!(await assertKudosExists(kudosId))) {
    return c.json({ error: 'kudos not found' }, 404)
  }
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      authorId: comments.authorId,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.kudosId, kudosId))
    .orderBy(asc(comments.createdAt))
  return c.json(rows)
})

// POST /api/kudos/:kudosId/comments
commentsRoute.post('/', async (c) => {
  const kudosId = c.req.param('kudosId')!
  if (!z.string().uuid().safeParse(kudosId).success) {
    return c.json({ error: 'invalid id' }, 400)
  }
  if (!(await assertKudosExists(kudosId))) {
    return c.json({ error: 'kudos not found' }, 404)
  }
  const body = await c.req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'invalid body' }, 400)

  const me = c.get('user')
  const [inserted] = await db
    .insert(comments)
    .values({ kudosId, authorId: me.id, body: parsed.data.body })
    .returning()
  return c.json(inserted, 201)
})
