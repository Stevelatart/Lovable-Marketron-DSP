import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id:        text('id').primaryKey(),
  email:     text('email').notNull().unique(),
  password:  text('password').notNull(),
  role:      text('role').notNull().default('ADVERTISER'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const advertisers = sqliteTable('advertisers', {
  id:           text('id').primaryKey(),
  name:         text('name').notNull(),
  userId:       text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  emailKeyword: text('email_keyword').notNull().default(''),
  dspAccountId: text('dsp_account_id').notNull().default(''),
  lastReportAt: integer('last_report_at', { mode: 'timestamp' }),
  createdAt:    integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const permissions = sqliteTable('permissions', {
  id:           text('id').primaryKey(),
  advertiserId: text('advertiser_id').notNull().unique().references(() => advertisers.id, { onDelete: 'cascade' }),
  kpis:         integer('kpis', { mode: 'boolean' }).notNull().default(true),
  supply:       integer('supply', { mode: 'boolean' }).notNull().default(false),
  audience:     integer('audience', { mode: 'boolean' }).notNull().default(false),
  tactics:      integer('tactics', { mode: 'boolean' }).notNull().default(true),
  updatedAt:    integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const kpiSnapshots = sqliteTable('kpi_snapshots', {
  id:           text('id').primaryKey(),
  advertiserId: text('advertiser_id').notNull().references(() => advertisers.id, { onDelete: 'cascade' }),
  date:         integer('date', { mode: 'timestamp' }).notNull(),
  impressions:  integer('impressions').notNull().default(0),
  clicks:       integer('clicks').notNull().default(0),
  ctr:          real('ctr').notNull().default(0),
  spend:        real('spend').notNull().default(0),
  cpm:          real('cpm').notNull().default(0),
  cpc:          real('cpc').notNull().default(0),
  roas:         real('roas').notNull().default(0),
  conversions:  integer('conversions').notNull().default(0),
  revenue:      real('revenue').notNull().default(0),
  createdAt:    integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => ({
  advDateUniq: uniqueIndex('kpi_adv_date').on(t.advertiserId, t.date),
  advDateIdx:  index('kpi_adv_date_idx').on(t.advertiserId, t.date),
}))

export const supplySnapshots = sqliteTable('supply_snapshots', {
  id:           text('id').primaryKey(),
  advertiserId: text('advertiser_id').notNull().references(() => advertisers.id, { onDelete: 'cascade' }),
  date:         integer('date', { mode: 'timestamp' }).notNull(),
  source:       text('source').notNull(),
  format:       text('format').notNull(),
  impressions:  integer('impressions').notNull().default(0),
  winRate:      real('win_rate').notNull().default(0),
  floorPrice:   real('floor_price').notNull().default(0),
  spend:        real('spend').notNull().default(0),
  createdAt:    integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => ({
  advDateIdx: index('supply_adv_date_idx').on(t.advertiserId, t.date),
}))

export const audienceSnapshots = sqliteTable('audience_snapshots', {
  id:           text('id').primaryKey(),
  advertiserId: text('advertiser_id').notNull().references(() => advertisers.id, { onDelete: 'cascade' }),
  date:         integer('date', { mode: 'timestamp' }).notNull(),
  segmentName:  text('segment_name').notNull(),
  segmentType:  text('segment_type').notNull(),
  impressions:  integer('impressions').notNull().default(0),
  uniqueReach:  integer('unique_reach').notNull().default(0),
  frequency:    real('frequency').notNull().default(0),
  spend:        real('spend').notNull().default(0),
  createdAt:    integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => ({
  advDateIdx: index('aud_adv_date_idx').on(t.advertiserId, t.date),
}))

export const tacticSnapshots = sqliteTable('tactic_snapshots', {
  id:           text('id').primaryKey(),
  advertiserId: text('advertiser_id').notNull().references(() => advertisers.id, { onDelete: 'cascade' }),
  date:         integer('date', { mode: 'timestamp' }).notNull(),
  orderName:    text('order_name').notNull(),
  tacticName:   text('tactic_name').notNull(),
  impressions:  integer('impressions').notNull().default(0),
  clicks:       integer('clicks').notNull().default(0),
  spend:        real('spend').notNull().default(0),
  roas:         real('roas').notNull().default(0),
  orders:       integer('orders').notNull().default(0),
  revenue:      real('revenue').notNull().default(0),
  createdAt:    integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => ({
  advDateIdx: index('tac_adv_date_idx').on(t.advertiserId, t.date),
}))
