import { google } from 'googleapis'
import { parse } from 'csv-parse/sync'
import { randomUUID } from 'crypto'
import { db } from './db'
import { advertisers, kpiSnapshots, supplySnapshots, audienceSnapshots, tacticSnapshots } from './schema'
import { eq } from 'drizzle-orm'

function getGmailClient() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  )
  oauth2.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  return google.gmail({ version: 'v1', auth: oauth2 })
}

async function fetchReportEmails(gmail: ReturnType<typeof google.gmail>) {
  const fromFilter = process.env.DSP_REPORT_FROM_FILTER ?? 'amazon.com'
  const subjectFilter = process.env.DSP_REPORT_SUBJECT_FILTER ?? 'Amazon DSP'
  const q = `from:${fromFilter} subject:"${subjectFilter}" is:unread has:attachment`
  const list = await gmail.users.messages.list({ userId: 'me', q, maxResults: 50 })
  return list.data.messages ?? []
}

function decodeBase64(data: string) {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

async function getAttachments(gmail: ReturnType<typeof google.gmail>, messageId: string) {
  const msg = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' })
  const parts = msg.data.payload?.parts ?? []
  const attachments: { filename: string; data: string }[] = []
  for (const part of parts) {
    if (!part.filename?.endsWith('.csv')) continue
    if (part.body?.attachmentId) {
      const att = await gmail.users.messages.attachments.get({ userId: 'me', messageId, id: part.body.attachmentId })
      if (att.data.data) attachments.push({ filename: part.filename, data: decodeBase64(att.data.data) })
    } else if (part.body?.data) {
      attachments.push({ filename: part.filename, data: decodeBase64(part.body.data) })
    }
  }
  return { attachments, subject: msg.data.payload?.headers?.find(h => h.name === 'Subject')?.value ?? '' }
}

function matchAdvertiser(advList: { id: string; emailKeyword: string }[], subject: string) {
  const lower = subject.toLowerCase()
  for (const adv of advList) {
    if (adv.emailKeyword && lower.includes(adv.emailKeyword.toLowerCase())) return adv.id
  }
  return null
}

function detectType(filename: string, headers: string[]): 'kpi' | 'supply' | 'audience' | 'tactic' | null {
  const fn = filename.toLowerCase()
  if (fn.includes('supply') || fn.includes('inventory')) return 'supply'
  if (fn.includes('audience') || fn.includes('segment')) return 'audience'
  if (fn.includes('tactic') || fn.includes('order_line')) return 'tactic'
  if (fn.includes('performance') || fn.includes('kpi')) return 'kpi'
  const h = headers.map(x => x.toLowerCase())
  if (h.some(x => x.includes('win rate'))) return 'supply'
  if (h.some(x => x.includes('audience segment'))) return 'audience'
  if (h.some(x => x.includes('order line'))) return 'tactic'
  if (h.some(x => x.includes('impression'))) return 'kpi'
  return null
}

function pf(v: string) { return parseFloat(v?.replace(/[%,$]/g, '') ?? '0') || 0 }
function pi(v: string) { return parseInt(v?.replace(/,/g, '') ?? '0', 10) || 0 }

async function processKPI(rows: Record<string, string>[], advertiserId: string, date: Date) {
  const agg = rows.reduce((a, r) => ({
    impressions: a.impressions + pi(r['Impressions'] ?? r['impressions'] ?? '0'),
    clicks: a.clicks + pi(r['Clicks'] ?? r['clicks'] ?? '0'),
    spend: a.spend + pf(r['Total Cost'] ?? r['Advertiser Cost'] ?? r['spend'] ?? '0'),
    revenue: a.revenue + pf(r['Product Sales'] ?? r['Revenue'] ?? r['revenue'] ?? '0'),
    conversions: a.conversions + pi(r['Orders'] ?? r['Conversions'] ?? '0'),
  }), { impressions: 0, clicks: 0, spend: 0, revenue: 0, conversions: 0 })

  await db.insert(kpiSnapshots).values({
    id: randomUUID(), advertiserId, date,
    impressions: agg.impressions, clicks: agg.clicks, spend: agg.spend, revenue: agg.revenue, conversions: agg.conversions,
    ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
    cpm: agg.impressions > 0 ? (agg.spend / agg.impressions) * 1000 : 0,
    cpc: agg.clicks > 0 ? agg.spend / agg.clicks : 0,
    roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
  }).onConflictDoNothing()
}

async function processSupply(rows: Record<string, string>[], advertiserId: string, date: Date) {
  for (const r of rows) {
    await db.insert(supplySnapshots).values({
      id: randomUUID(), advertiserId, date,
      source: r['Supply Source'] ?? r['Source'] ?? 'Unknown',
      format: r['Format'] ?? r['Ad Format'] ?? 'Unknown',
      impressions: pi(r['Impressions'] ?? '0'),
      winRate: pf(r['Bid Win Rate'] ?? r['Win Rate'] ?? '0'),
      floorPrice: pf(r['Average Floor Price'] ?? r['Floor Price'] ?? '0'),
      spend: pf(r['Total Cost'] ?? r['Spend'] ?? '0'),
    })
  }
}

async function processAudience(rows: Record<string, string>[], advertiserId: string, date: Date) {
  for (const r of rows) {
    await db.insert(audienceSnapshots).values({
      id: randomUUID(), advertiserId, date,
      segmentName: r['Audience Segment'] ?? r['Segment Name'] ?? 'Unknown',
      segmentType: r['Audience Type'] ?? r['Segment Type'] ?? 'Unknown',
      impressions: pi(r['Impressions'] ?? '0'),
      uniqueReach: pi(r['Unique Reach'] ?? r['Reach'] ?? '0'),
      frequency: pf(r['Average Frequency'] ?? r['Frequency'] ?? '0'),
      spend: pf(r['Total Cost'] ?? r['Spend'] ?? '0'),
    })
  }
}

async function processTactic(rows: Record<string, string>[], advertiserId: string, date: Date) {
  for (const r of rows) {
    const spend = pf(r['Total Cost'] ?? r['Spend'] ?? '0')
    const revenue = pf(r['Product Sales'] ?? r['Revenue'] ?? '0')
    await db.insert(tacticSnapshots).values({
      id: randomUUID(), advertiserId, date,
      orderName: r['Order'] ?? r['Campaign'] ?? 'Unknown',
      tacticName: r['Order Line'] ?? r['Line Item'] ?? r['Tactic'] ?? 'Unknown',
      impressions: pi(r['Impressions'] ?? '0'),
      clicks: pi(r['Clicks'] ?? '0'),
      spend, revenue,
      roas: spend > 0 ? revenue / spend : 0,
      orders: pi(r['Orders'] ?? r['Conversions'] ?? '0'),
    })
  }
}

export async function processInboundReports(): Promise<{ processed: number; errors: string[] }> {
  const gmail = getGmailClient()
  const messages = await fetchReportEmails(gmail)
  const advList = await db.select({ id: advertisers.id, emailKeyword: advertisers.emailKeyword }).from(advertisers)

  let processed = 0
  const errors: string[] = []

  for (const msg of messages) {
    if (!msg.id) continue
    try {
      const { attachments, subject } = await getAttachments(gmail, msg.id)
      const advertiserId = matchAdvertiser(advList, subject)

      if (!advertiserId) {
        errors.push(`No advertiser match: "${subject}"`)
        await gmail.users.messages.modify({ userId: 'me', id: msg.id, requestBody: { removeLabelIds: ['UNREAD'] } })
        continue
      }

      for (const { filename, data } of attachments) {
        const rows = parse(data, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]
        if (!rows.length) continue

        const type = detectType(filename, Object.keys(rows[0]))
        const dateStr = rows[0]['Date'] ?? rows[0]['date']
        const date = dateStr ? new Date(dateStr) : new Date()
        date.setHours(0, 0, 0, 0)

        if (type === 'kpi') await processKPI(rows, advertiserId, date)
        else if (type === 'supply') await processSupply(rows, advertiserId, date)
        else if (type === 'audience') await processAudience(rows, advertiserId, date)
        else if (type === 'tactic') await processTactic(rows, advertiserId, date)
        else errors.push(`Unknown type in: ${filename}`)
        processed++
      }

      await db.update(advertisers).set({ lastReportAt: new Date() }).where(eq(advertisers.id, advertiserId))
      await gmail.users.messages.modify({ userId: 'me', id: msg.id, requestBody: { removeLabelIds: ['UNREAD'] } })
    } catch (err) {
      errors.push(`Error on ${msg.id}: ${String(err)}`)
    }
  }

  return { processed, errors }
}
