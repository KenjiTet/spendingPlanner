import Database from 'better-sqlite3'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Where the Railway volume is mounted; a local folder when running the server by hand
const DATA_DIR = process.env.DATA_DIR ?? './data'
const here = dirname(fileURLToPath(import.meta.url))

// The volume is empty on the first deploy
mkdirSync(DATA_DIR, { recursive: true })

export const db = new Database(join(DATA_DIR, 'spending-planner.db'))

// WAL keeps reads working while a write is in flight, foreign keys are off by default in SQLite
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Creating the tables is idempotent, so it runs on every boot
db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'))
