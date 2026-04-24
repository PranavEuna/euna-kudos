import { Hono } from 'hono'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { kudos, users } from '../db/schema.js'

export const statsRoute = new Hono()

// GET /api/stats/top-recipients — leaderboard of most-kudos'd users.
statsRoute.get('/top-recipients', async (c) => {
  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      count: sql<number>`count(${kudos.id})::int`.as('count'),
    })
    .from(kudos)
    .innerJoin(users, eq(users.id, kudos.toUserId))
    .groupBy(users.id, users.name, users.email)
    .orderBy(desc(sql`count(${kudos.id})`))
    .limit(5)
  return c.json(rows)
})

// GET /api/stats/category-counts — used by the feed filter chips.
statsRoute.get('/category-counts', async (c) => {
  const rows = await db
    .select({
      category: kudos.category,
      count: sql<number>`count(*)::int`.as('count'),
    })
    .from(kudos)
    .groupBy(kudos.category)
  return c.json(rows)
})
