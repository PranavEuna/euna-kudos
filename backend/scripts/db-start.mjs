/**
 * npm run db:start
 *
 * Starts PostgreSQL as a background process and writes a PID file so
 * db:stop can shut it down later.  Run this in a separate terminal when
 * you want to control the DB and dev server independently.
 *
 * For most workflows, `npm run dev` (which manages postgres automatically)
 * is simpler.
 */
import EmbeddedPostgres from 'embedded-postgres'
import fs from 'fs'
import path from 'path'
import {
  ROOT, DATA_DIR, PID_FILE, DB_NAME, DB_PORT,
  makeEmbeddedPg,
} from './_pg-config.mjs'

// Check for stale PID file
if (fs.existsSync(PID_FILE)) {
  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim())
  try {
    process.kill(pid, 0) // throws if process doesn't exist
    console.log(`PostgreSQL is already running (PID ${pid})`)
    process.exit(0)
  } catch {
    fs.unlinkSync(PID_FILE) // stale — clean up and continue
  }
}

const pg = makeEmbeddedPg(EmbeddedPostgres)
if (!fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
  await pg.initialise()
}
await pg.start()
try { await pg.createDatabase(DB_NAME) } catch { /* already exists */ }

fs.writeFileSync(PID_FILE, process.pid.toString())
console.log(`PostgreSQL running on port ${DB_PORT}  (PID ${process.pid})`)
console.log('Press Ctrl-C or run `npm run db:stop` to shut down.')

const shutdown = async () => {
  await pg.stop()
  if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE)
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// Keep the process alive
await new Promise(() => {})
