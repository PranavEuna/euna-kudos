import { Hono } from 'hono'
import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '../db/index.js'
import { kudos, users, kudosCategories } from '../db/schema.js'
import { isAdmin } from '../lib/admin.js'

export const kudosRoute = new Hono()

const createSchema = z.object({
  toUserId: z.string().uuid(),
  category: z.enum(kudosCategories),
  message: z.string().trim().min(1).max(1000),
})

const featureSchema = z.object({
  featured: z.boolean(),
})

const categoryQuery = z.enum(kudosCategories).optional()

// Reusable join: kudos + sender + recipient
function kudosSelect() {
  const fromUser = alias(users, 'from_user')
  const toUser = alias(users, 'to_user')
  return {
    fromUser,
    toUser,
    columns: {
      id: kudos.id,
      category: kudos.category,
      message: kudos.message,
      featured: kudos.featured,
      createdAt: kudos.createdAt,
      fromUserId: kudos.fromUserId,
      fromName: fromUser.name,
      fromEmail: fromUser.email,
      toUserId: kudos.toUserId,
      toName: toUser.name,
      toEmail: toUser.email,
    },
  }
}

// GET /api/kudos?category=teamwork
kudosRoute.get('/', async (c) => {
  const raw = c.req.query('category')
  const parsed = categoryQuery.safeParse(raw)
  if (raw && !parsed.success) return c.json({ error: 'invalid category' }, 400)
  const category = parsed.success ? parsed.data : undefined

  const { fromUser, toUser, columns } = kudosSelect()
  const q = db
    .select(columns)
    .from(kudos)
    .innerJoin(fromUser, eq(kudos.fromUserId, fromUser.id))
    .innerJoin(toUser, eq(kudos.toUserId, toUser.id))
    .orderBy(desc(kudos.featured), desc(kudos.createdAt))

  const rows = category ? await q.where(eq(kudos.category, category)) : await q
  return c.json(rows)
})

// GET /api/kudos/:id
kudosRoute.get('/:id', async (c) => {
  const id = c.req.param('id')
  if (!z.string().uuid().safeParse(id).success) {
    return c.json({ error: 'invalid id' }, 400)
  }
  const { fromUser, toUser, columns } = kudosSelect()
  const [row] = await db
    .select(columns)
    .from(kudos)
    .innerJoin(fromUser, eq(kudos.fromUserId, fromUser.id))
    .innerJoin(toUser, eq(kudos.toUserId, toUser.id))
    .where(eq(kudos.id, id))
    .limit(1)
  if (!row) return c.json({ error: 'not found' }, 404)
  return c.json(row)
})

// POST /api/kudos
kudosRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'invalid body', details: parsed.error.issues }, 400)
  const { toUserId, category, message } = parsed.data
  const me = c.get('user')

  if (toUserId === me.id) {
    return c.json({ error: 'cannot give kudos to yourself' }, 400)
  }

  const [recipient] = await db.select().from(users).where(eq(users.id, toUserId)).limit(1)
  if (!recipient) return c.json({ error: 'recipient not found' }, 400)

  const [inserted] = await db
    .insert(kudos)
    .values({ fromUserId: me.id, toUserId, category, message })
    .returning()
  return c.json(inserted, 201)
})

// PATCH /api/kudos/:id/feature  (admin only)
kudosRoute.patch('/:id/feature', async (c) => {
  if (!isAdmin(c)) return c.json({ error: 'forbidden' }, 403)
  const id = c.req.param('id')
  if (!z.string().uuid().safeParse(id).success) {
    return c.json({ error: 'invalid id' }, 400)
  }
  const body = await c.req.json().catch(() => null)
  const parsed = featureSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'invalid body' }, 400)

  const [updated] = await db
    .update(kudos)
    .set({ featured: parsed.data.featured })
    .where(eq(kudos.id, id))
    .returning()
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})
