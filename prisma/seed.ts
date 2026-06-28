import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { subDays } from 'date-fns'
import * as schema from '../src/lib/schema'

const { users, advertisers, permissions, kpiSnapshots, supplySnapshots, audienceSnapshots, tacticSnapshots } = schema

const sqlite = new Database('./dev.db')
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
const db = drizzle(sqlite, { schema })

const advertiserDefs = [
  { name: 'Apex Electronics', email: 'apex@demo.com', keyword: 'Apex Electronics', kpis: true, supply: true, audience: true, tactics: true },
  { name: 'Blue Ridge Outdoors', email: 'blueridge@demo.com', keyword: 'Blue Ridge Outdoors', kpis: true, supply: false, audience: true, tactics: true },
  { name: 'Coastal Home Goods', email: 'coastal@demo.com', keyword: 'Coastal Home Goods', kpis: true, supply: true, audience: false, tactics: false },
  { name: 'Denver Sports Co', email: 'denver@demo.com', keyword: 'Denver Sports', kpis: true, supply: false, audience: false, tactics: true },
  { name: 'Evergreen Beauty', email: 'evergreen@demo.com', keyword: 'Evergreen Beauty', kpis: true, supply: true, audience: true, tactics: false },
  { name: 'Fusion Tech Gear', email: 'fusion@demo.com', keyword: 'Fusion Tech', kpis: true, supply: true, audience: true, tactics: true },
]

function rand(min: number, max: number) { return Math.random() * (max - min) + min }
function randInt(min: number, max: number) { return Math.floor(rand(min, max)) }

async function main() {
  console.log('Running migrations...')
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'ADVERTISER', created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()));
    CREATE TABLE IF NOT EXISTS advertisers (id TEXT PRIMARY KEY, name TEXT NOT NULL, user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, email_keyword TEXT NOT NULL DEFAULT '', dsp_account_id TEXT NOT NULL DEFAULT '', last_report_at INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
    CREATE TABLE IF NOT EXISTS permissions (id TEXT PRIMARY KEY, advertiser_id TEXT NOT NULL UNIQUE REFERENCES advertisers(id) ON DELETE CASCADE, kpis INTEGER NOT NULL DEFAULT 1, supply INTEGER NOT NULL DEFAULT 0, audience INTEGER NOT NULL DEFAULT 0, tactics INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL DEFAULT (unixepoch()));
    CREATE TABLE IF NOT EXISTS kpi_snapshots (id TEXT PRIMARY KEY, advertiser_id TEXT NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE, date INTEGER NOT NULL, impressions INTEGER NOT NULL DEFAULT 0, clicks INTEGER NOT NULL DEFAULT 0, ctr REAL NOT NULL DEFAULT 0, spend REAL NOT NULL DEFAULT 0, cpm REAL NOT NULL DEFAULT 0, cpc REAL NOT NULL DEFAULT 0, roas REAL NOT NULL DEFAULT 0, conversions INTEGER NOT NULL DEFAULT 0, revenue REAL NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (unixepoch()), UNIQUE(advertiser_id, date));
    CREATE TABLE IF NOT EXISTS supply_snapshots (id TEXT PRIMARY KEY, advertiser_id TEXT NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE, date INTEGER NOT NULL, source TEXT NOT NULL, format TEXT NOT NULL, impressions INTEGER NOT NULL DEFAULT 0, win_rate REAL NOT NULL DEFAULT 0, floor_price REAL NOT NULL DEFAULT 0, spend REAL NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
    CREATE TABLE IF NOT EXISTS audience_snapshots (id TEXT PRIMARY KEY, advertiser_id TEXT NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE, date INTEGER NOT NULL, segment_name TEXT NOT NULL, segment_type TEXT NOT NULL, impressions INTEGER NOT NULL DEFAULT 0, unique_reach INTEGER NOT NULL DEFAULT 0, frequency REAL NOT NULL DEFAULT 0, spend REAL NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
    CREATE TABLE IF NOT EXISTS tactic_snapshots (id TEXT PRIMARY KEY, advertiser_id TEXT NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE, date INTEGER NOT NULL, order_name TEXT NOT NULL, tactic_name TEXT NOT NULL, impressions INTEGER NOT NULL DEFAULT 0, clicks INTEGER NOT NULL DEFAULT 0, spend REAL NOT NULL DEFAULT 0, roas REAL NOT NULL DEFAULT 0, orders INTEGER NOT NULL DEFAULT 0, revenue REAL NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
  `)
  console.log('Seeding...')

  sqlite.exec('DELETE FROM users')

  const adminHash = await bcrypt.hash('admin123', 10)
  const adminId = randomUUID()
  await db.insert(users).values({ id: adminId, email: 'admin@marketron.com', password: adminHash, role: 'ADMIN' })

  for (const adv of advertiserDefs) {
    const hash = await bcrypt.hash('advertiser123', 10)
    const userId = randomUUID()
    const advertiserId = randomUUID()
    const permId = randomUUID()

    await db.insert(users).values({ id: userId, email: adv.email, password: hash, role: 'ADVERTISER' })
    await db.insert(advertisers).values({ id: advertiserId, name: adv.name, userId, emailKeyword: adv.keyword })
    await db.insert(permissions).values({ id: permId, advertiserId, kpis: adv.kpis, supply: adv.supply, audience: adv.audience, tactics: adv.tactics })

    const kpiRows: (typeof kpiSnapshots.$inferInsert)[] = []
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i)
      d.setHours(0, 0, 0, 0)
      const imp = randInt(80000, 300000)
      const clicks = randInt(500, 3000)
      const spend = rand(2000, 15000)
      const revenue = spend * rand(1.5, 4.5)
      kpiRows.push({ id: randomUUID(), advertiserId, date: d, impressions: imp, clicks, ctr: (clicks / imp) * 100, spend, cpm: (spend / imp) * 1000, cpc: spend / clicks, roas: revenue / spend, conversions: randInt(10, 200), revenue })
    }
    for (const row of kpiRows) {
      await db.insert(kpiSnapshots).values(row).onConflictDoNothing()
    }

    const sources = [{ source: 'Amazon OTT', format: 'Video' }, { source: 'Amazon Publisher Services', format: 'Display' }, { source: 'Twitch', format: 'Video' }, { source: 'IMDb', format: 'Display' }, { source: 'Fire TV', format: 'Video' }]
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i); d.setHours(0, 0, 0, 0)
      for (const s of sources) {
        await db.insert(supplySnapshots).values({ id: randomUUID(), advertiserId, date: d, source: s.source, format: s.format, impressions: randInt(10000, 80000), winRate: rand(40, 80), floorPrice: rand(2, 12), spend: rand(300, 4000) })
      }
    }

    const segments = [{ name: 'In-Market: Electronics', type: 'In-Market' }, { name: 'In-Market: Sports & Outdoors', type: 'In-Market' }, { name: 'Lifestyle: Fitness Enthusiasts', type: 'Lifestyle' }, { name: 'Contextual: Home Improvement', type: 'Contextual' }, { name: 'Retargeting: Product Views', type: 'Retargeting' }, { name: 'Retargeting: Cart Abandoners', type: 'Retargeting' }]
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i); d.setHours(0, 0, 0, 0)
      for (const seg of segments) {
        const imp = randInt(5000, 60000)
        await db.insert(audienceSnapshots).values({ id: randomUUID(), advertiserId, date: d, segmentName: seg.name, segmentType: seg.type, impressions: imp, uniqueReach: randInt(Math.floor(imp * 0.3), Math.floor(imp * 0.7)), frequency: rand(1.2, 4.5), spend: rand(100, 2000) })
      }
    }

    const tactics = [{ order: 'Brand Awareness Q2', tactic: 'Prospecting - In-Market' }, { order: 'Brand Awareness Q2', tactic: 'Prospecting - Lifestyle' }, { order: 'Retargeting Campaign', tactic: 'Retargeting - Product Views' }, { order: 'Retargeting Campaign', tactic: 'Retargeting - Cart Abandoners' }, { order: 'OTT Awareness', tactic: 'OTT - Premium Video' }]
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i); d.setHours(0, 0, 0, 0)
      for (const t of tactics) {
        const spend = rand(200, 3000); const revenue = spend * rand(1.2, 5.0)
        await db.insert(tacticSnapshots).values({ id: randomUUID(), advertiserId, date: d, orderName: t.order, tacticName: t.tactic, impressions: randInt(10000, 80000), clicks: randInt(100, 1500), spend, roas: revenue / spend, orders: randInt(5, 150), revenue })
      }
    }

    await db.update(advertisers).set({ lastReportAt: new Date() }).where(eq(advertisers.id, advertiserId))
    console.log(`  ✓ ${adv.name}`)
  }

  console.log('\nDone!\n  Admin: admin@marketron.com / admin123\n  Advertiser: apex@demo.com / advertiser123')
  sqlite.close()
}

main().catch(e => { console.error(e); process.exit(1) })
