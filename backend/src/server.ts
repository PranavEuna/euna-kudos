import 'dotenv/config'
import { serve } from '@hono/node-server'
import { app } from './app.js'

if (process.env.NODE_ENV === 'production' && process.env.AUTH_MODE === 'local_mock') {
  console.error('FATAL: AUTH_MODE=local_mock must not be set in production')
  process.exit(1)
}

const port = Number(process.env.PORT ?? 3000)

serve({ fetch: app.fetch, port }, () => {
  console.log(`Local server → http://localhost:${port}`)
})
