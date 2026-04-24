/**
 * npm run db:psql
 *
 * A simple interactive SQL REPL for the local database.
 * The embedded-postgres package does not ship the psql client binary,
 * so this script provides an equivalent using the postgres.js driver.
 *
 * Usage: type any SQL statement, end it with a semicolon, press Enter.
 * Type \q or press Ctrl-C to exit.
 *
 * PostgreSQL must already be running (`npm run dev` or `npm run db:start`).
 */
import 'dotenv/config'
import readline from 'readline'
import postgres from 'postgres'
import { DATABASE_URL } from './_pg-config.mjs'

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} })

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

const masked = DATABASE_URL.replace(/:([^:@]+)@/, ':****@')
console.log(`Connected to ${masked}`)
console.log('End statements with ; to execute.  \\q or Ctrl-C to exit.\n')

let buffer = ''

const prompt = () =>
  rl.question(buffer ? '      -> ' : 'sql> ', async (line) => {
    const trimmed = line.trim()

    if (trimmed === '\\q') {
      rl.close()
      return
    }

    buffer += (buffer ? '\n' : '') + line

    if (buffer.trimEnd().endsWith(';')) {
      try {
        const result = await sql.unsafe(buffer)
        if (Array.isArray(result) && result.length > 0) {
          console.table(result)
        } else {
          const count = result?.count ?? result?.length ?? 0
          console.log(`OK  (${count} row${count === 1 ? '' : 's'} affected)`)
        }
      } catch (err) {
        console.error('Error:', err.message)
      }
      buffer = ''
    }

    prompt()
  })

prompt()

const shutdown = async () => {
  console.log()
  await sql.end({ timeout: 2 })
  process.exit(0)
}

rl.on('close', shutdown)
process.on('SIGINT', shutdown)
