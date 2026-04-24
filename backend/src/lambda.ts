import { handle } from 'hono/aws-lambda'
import { app } from './app.js'

if (process.env.NODE_ENV === 'production' && process.env.AUTH_MODE === 'local_mock') {
  console.error('FATAL: AUTH_MODE=local_mock must not be set in production')
  process.exit(1)
}

export const handler = handle(app)
