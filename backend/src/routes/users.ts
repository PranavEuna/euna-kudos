import { Hono } from 'hono'
import { asc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'

export const usersRoute = new Hono()

usersRoute.get('/', async (c) => {
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .orderBy(asc(users.name))
  return c.json(rows)
})
