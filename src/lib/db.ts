import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'path'

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') ?? './dev.db'
const dbPath = path.isAbsolute(DB_PATH) ? DB_PATH : path.join(process.cwd(), DB_PATH)

const globalForDb = globalThis as unknown as { _db: ReturnType<typeof drizzle> }

function createDb() {
  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  return drizzle(sqlite, { schema })
}

export const db = globalForDb._db ?? createDb()

if (process.env.NODE_ENV !== 'production') globalForDb._db = db
