/**
 * npm run db:stop
 *
 * Stops the PostgreSQL process started by db:start by signalling it via
 * the PID file it wrote.
 */
import fs from 'fs'
import { PID_FILE } from './_pg-config.mjs'

if (!fs.existsSync(PID_FILE)) {
  console.log('PostgreSQL is not running (no PID file found).')
  process.exit(0)
}

const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim())

try {
  process.kill(pid, 'SIGTERM')
  console.log(`Stopped PostgreSQL (PID ${pid}).`)
} catch (err) {
  if (err.code === 'ESRCH') {
    console.log('PostgreSQL was not running (stale PID file removed).')
    fs.unlinkSync(PID_FILE)
  } else {
    throw err
  }
}
