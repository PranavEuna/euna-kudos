/**
 * npm run dev
 *
 * Starts embedded PostgreSQL, runs migrations, then starts the Hono dev
 * server with hot-reload.  Ctrl-C shuts everything down cleanly.
 *
 * On Windows the Git-Bash shell used by Claude Code doesn't have node/npx
 * on PATH.  We fix this by prepending NODE_BIN (dirname of process.execPath)
 * to the PATH we pass to every child process we spawn.
 */
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import EmbeddedPostgres from 'embedded-postgres'
import {
  ROOT, DATA_DIR, ENV_FILE,
  DB_NAME, DB_PORT, DATABASE_URL,
  childEnv, makeEmbeddedPg,
} from './_pg-config.mjs'

// ── 1. Start PostgreSQL ───────────────────────────────────────────────────────
const pg = makeEmbeddedPg(EmbeddedPostgres)

process.stdout.write('Starting PostgreSQL...')
// Only run initdb if the data directory hasn't been initialised yet.
// embedded-postgres does not guard against re-running initdb on an
// existing cluster, so we do it ourselves.
if (!fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
  await pg.initialise()
}
await pg.start()
console.log(` ready on port ${DB_PORT}`)

try { await pg.createDatabase(DB_NAME) } catch { /* already exists */ }

// ── 2. Write .env if missing; patch any missing keys in existing file ─────────
if (!fs.existsSync(ENV_FILE)) {
  fs.writeFileSync(ENV_FILE, `DATABASE_URL=${DATABASE_URL}\nPORT=3000\nAUTH_MODE=local_mock\n`)
  console.log('.env created')
} else {
  const contents = fs.readFileSync(ENV_FILE, 'utf8')
  if (!contents.includes('AUTH_MODE=')) {
    fs.appendFileSync(ENV_FILE, '\nAUTH_MODE=local_mock\n')
    console.log('.env patched: added AUTH_MODE=local_mock')
  }
}

// ── 3. Generate + apply migrations ───────────────────────────────────────────
// If no migration files exist yet, generate them from the current schema first.
const journalPath = path.join(ROOT, 'drizzle', 'meta', '_journal.json')
if (!fs.existsSync(journalPath)) {
  console.log('No migrations found — generating from schema...')
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
}

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

// ── 4. Start dev server ───────────────────────────────────────────────────────
const server = spawn('npx', ['tsx', 'watch', 'src/server.ts'], {
  stdio: 'inherit',
  shell: true,
  cwd: ROOT,
  env: childEnv({ DATABASE_URL }),
})

// ── 5. Graceful shutdown ──────────────────────────────────────────────────────
const shutdown = async () => {
  console.log('\nShutting down...')
  server.kill()
  await pg.stop()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
