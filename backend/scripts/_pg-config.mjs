// Shared config imported by all db scripts
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const _require = createRequire(import.meta.url)

export const ROOT = path.resolve(__dirname, '..')
export const DATA_DIR = path.join(ROOT, '.postgres-data')
export const PID_FILE = path.join(ROOT, '.postgres.pid')
export const ENV_FILE = path.join(ROOT, '.env')

export const DB_USER = 'app'
export const DB_PASSWORD = 'localpassword'
export const DB_NAME = 'app'
export const DB_PORT = 5432
export const DATABASE_URL =
  `postgres://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}`

// Directory containing node/npm/npx executables
export const NODE_BIN = path.dirname(process.execPath)

// Inherit env and ensure node binaries are on PATH for child processes
export function childEnv(extra = {}) {
  return {
    ...process.env,
    PATH: `${NODE_BIN}${path.delimiter}${process.env.PATH ?? ''}`,
    ...extra,
  }
}

// Find the psql / pg_ctl binary bundled by embedded-postgres
export function pgBin(name) {
  const platformPkg = {
    'win32-x64':    '@embedded-postgres/windows-x64',
    'darwin-arm64': '@embedded-postgres/darwin-arm',
    'darwin-x64':   '@embedded-postgres/darwin-x64',
    'linux-x64':    '@embedded-postgres/linux-x64',
    'linux-arm64':  '@embedded-postgres/linux-arm64',
  }
  const key = `${process.platform}-${process.arch}`
  const pkg = platformPkg[key]
  if (!pkg) throw new Error(`Unsupported platform: ${key}`)

  let pkgDir
  try {
    pkgDir = path.dirname(_require.resolve(`${pkg}/package.json`))
  } catch {
    throw new Error(`${pkg} not found — run npm install first.`)
  }

  const ext = process.platform === 'win32' ? '.exe' : ''
  // binaries live in native/bin/ inside each platform package
  return path.join(pkgDir, 'native', 'bin', `${name}${ext}`)
}

export function makeEmbeddedPg(EmbeddedPostgres) {
  return new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    persistent: true,
  })
}
