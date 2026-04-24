/**
 * npm run db:reset
 *
 * Wipes the local database completely and starts fresh:
 *   1. Stop postgres if running
 *   2. Delete the data directory
 *   3. Re-initialise and start postgres
 *   4. Re-create the database
 *   5. Run all migrations
 *
 * Useful when migrations are in a broken state or you want a clean slate.
 */
import { spawn } from 'child_process'
import fs from 'fs'
import EmbeddedPostgres from 'embedded-postgres'
import {
  ROOT, DATA_DIR, PID_FILE, ENV_FILE,
  DB_NAME, DB_PORT, DATABASE_URL,
  childEnv, makeEmbeddedPg,
} from './_pg-config.mjs'

// ── 1. Stop if running ────────────────────────────────────────────────────────
if (fs.existsSync(PID_FILE)) {
  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim())
  try {
    process.kill(pid, 'SIGTERM')
    console.log('Stopped existing PostgreSQL process.')
    await new Promise((r) => setTimeout(r, 1500)) // give it time to shut down
  } catch { /* already gone */ }
  fs.unlinkSync(PID_FILE)
}

// ── 2. Delete data directory ──────────────────────────────────────────────────
if (fs.existsSync(DATA_DIR)) {
  fs.rmSync(DATA_DIR, { recursive: true, force: true })
  console.log('Deleted .postgres-data/')
}

// ── 3. Re-initialise ──────────────────────────────────────────────────────────
const pg = makeEmbeddedPg(EmbeddedPostgres)

process.stdout.write('Initialising PostgreSQL...')
await pg.initialise()
await pg.start()
console.log(` ready on port ${DB_PORT}`)

try { await pg.createDatabase(DB_NAME) } catch { /* already exists */ }

// ── 4. Ensure .env exists ─────────────────────────────────────────────────────
if (!fs.existsSync(ENV_FILE)) {
  fs.writeFileSync(ENV_FILE, `DATABASE_URL=${DATABASE_URL}\nPORT=3000\n`)
  console.log('.env created')
}

// ── 5. Generate + apply migrations ───────────────────────────────────────────
console.log('Generating migrations from schema...')
await new Promise((resolve, reject) => {
  const p = spawn('npx', ['drizzle-kit', 'generate'], {
    stdio: 'inherit',
    shell: true,
    cwd: ROOT,
    env: childEnv({ DATABASE_URL }),
  })
  p.on('close', (code) =>
    code === 0 ? resolve() : reject(new Error(`Migration generation failed (exit ${code})`))
  )
})

await new Promise((resolve, reject) => {
  const p = spawn('npx', ['drizzle-kit', 'migrate'], {
    stdio: 'inherit',
    shell: true,
    cwd: ROOT,
    env: childEnv({ DATABASE_URL }),
  })
  p.on('close', (code) =>
    code === 0 ? resolve() : reject(new Error(`Migrations failed (exit ${code})`))
  )
})

console.log('Reset complete. Run `npm run dev` to start.')
await pg.stop()
