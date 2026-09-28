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

/**
 * Brings a table created by an older schema up to date: SQLite has no "add column if not exists"
 * @param {string} table
 * @param {string} column
 * @param {string} definition
 */
function addColumnIfMissing(table, column, definition) {
  const columns = db.pragma(`table_info(${table})`)

  if (!columns.some((candidate) => candidate.name === column)) {
    db.exec(`alter table ${table} add column ${column} ${definition}`)
  }
}

addColumnIfMissing('plan_lines', 'auto_book', 'integer not null default 0 check (auto_book in (0, 1))')
