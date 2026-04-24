import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)

const sql = postgres(process.env.DATABASE_URL!, {
  max: isLambda ? 1 : 10,
  idle_timeout: isLambda ? 20 : undefined,
})

export const db = drizzle(sql, { schema })
