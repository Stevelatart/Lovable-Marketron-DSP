import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') ?? './dev.db'
const dbPath = path.isAbsolute(DB_PATH) ? DB_PATH : path.join(process.cwd(), DB_PATH)

export function runMigrations() {
  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ADVERTISER',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS advertisers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      email_keyword TEXT NOT NULL DEFAULT '',
      dsp_account_id TEXT NOT NULL DEFAULT '',
      last_report_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      advertiser_id TEXT NOT NULL UNIQUE REFERENCES advertisers(id) ON DELETE CASCADE,
      kpis INTEGER NOT NULL DEFAULT 1,
      supply INTEGER NOT NULL DEFAULT 0,
      audience INTEGER NOT NULL DEFAULT 0,
      tactics INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS kpi_snapshots (
      id TEXT PRIMARY KEY,
      advertiser_id TEXT NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
      date INTEGER NOT NULL,
      impressions INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      ctr REAL NOT NULL DEFAULT 0,
      spend REAL NOT NULL DEFAULT 0,
      cpm REAL NOT NULL DEFAULT 0,
      cpc REAL NOT NULL DEFAULT 0,
      roas REAL NOT NULL DEFAULT 0,
      conversions INTEGER NOT NULL DEFAULT 0,
      revenue REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(advertiser_id, date)
    );

    CREATE TABLE IF NOT EXISTS supply_snapshots (
      id TEXT PRIMARY KEY,
      advertiser_id TEXT NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
      date INTEGER NOT NULL,
      source TEXT NOT NULL,
      format TEXT NOT NULL,
      impressions INTEGER NOT NULL DEFAULT 0,
      win_rate REAL NOT NULL DEFAULT 0,
      floor_price REAL NOT NULL DEFAULT 0,
      spend REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS audience_snapshots (
      id TEXT PRIMARY KEY,
      advertiser_id TEXT NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
      date INTEGER NOT NULL,
      segment_name TEXT NOT NULL,
      segment_type TEXT NOT NULL,
      impressions INTEGER NOT NULL DEFAULT 0,
      unique_reach INTEGER NOT NULL DEFAULT 0,
      frequency REAL NOT NULL DEFAULT 0,
      spend REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS tactic_snapshots (
      id TEXT PRIMARY KEY,
      advertiser_id TEXT NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
      date INTEGER NOT NULL,
      order_name TEXT NOT NULL,
      tactic_name TEXT NOT NULL,
      impressions INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      spend REAL NOT NULL DEFAULT 0,
      roas REAL NOT NULL DEFAULT 0,
      orders INTEGER NOT NULL DEFAULT 0,
      revenue REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS kpi_adv_date_idx ON kpi_snapshots(advertiser_id, date);
    CREATE INDEX IF NOT EXISTS supply_adv_date_idx ON supply_snapshots(advertiser_id, date);
    CREATE INDEX IF NOT EXISTS aud_adv_date_idx ON audience_snapshots(advertiser_id, date);
    CREATE INDEX IF NOT EXISTS tac_adv_date_idx ON tactic_snapshots(advertiser_id, date);
  `)

  sqlite.close()
}
