import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const kudosCategories = ['teamwork', 'impact', 'innovation', 'growth', 'customer-love'] as const
export type KudosCategory = (typeof kudosCategories)[number]

export const kudos = pgTable(
  'kudos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromUserId: uuid('from_user_id').notNull().references(() => users.id),
    toUserId: uuid('to_user_id').notNull().references(() => users.id),
    category: text('category', { enum: kudosCategories }).notNull(),
    message: text('message').notNull(),
    featured: boolean('featured').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('kudos_created_at_idx').on(t.createdAt)]
)

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  kudosId: uuid('kudos_id').notNull().references(() => kudos.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type Kudos = typeof kudos.$inferSelect
export type Comment = typeof comments.$inferSelect
