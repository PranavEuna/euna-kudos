import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requireAuth } from './middleware/auth.js'
import { isAdmin } from './lib/admin.js'
import { usersRoute } from './routes/users.js'
import { kudosRoute } from './routes/kudos.js'
import { commentsRoute } from './routes/comments.js'

export const app = new Hono()

app.use('*', cors())

app.get('/', (c) => c.json({ status: 'ok', app: 'euna-kudos' }))
app.get('/healthz', (c) => c.json({ status: 'ok' }))

const api = new Hono()
api.use('*', requireAuth)

api.get('/me', (c) => {
  const user = c.get('user')
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    groups: user.groups,
    isAdmin: isAdmin(c),
  })
})

api.route('/users', usersRoute)
api.route('/kudos', kudosRoute)
api.route('/kudos/:kudosId/comments', commentsRoute)

app.route('/api', api)
