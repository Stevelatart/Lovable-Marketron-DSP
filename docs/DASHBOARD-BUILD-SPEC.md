# Amazon DSP Advertiser Dashboard — Build Spec & Handoff

> **How to use this doc:** Paste the "Kickoff prompt" section below into a new
> Claude session, then attach or reference the rest of this file. It captures
> every decision, requirement, and lesson learned from the prototyping session
> so a fresh session can build the real thing without re-litigating scope.

---

## Kickoff prompt (paste this to start the new session)

> I'm building a multi-advertiser Amazon DSP performance dashboard for my agency
> (Brandography). I have ~6 advertiser clients today, adding 1–2 per month. Each
> advertiser gets their own login and sees ONLY their own data. As the admin, I
> control which data sections each advertiser is allowed to view. Data refreshes
> overnight. The full spec is in `docs/DASHBOARD-BUILD-SPEC.md` — read it first,
> then propose a build plan. Start with the data model and the funnel-organized
> line-item report, which is the most important view.

---

## 1. Product overview

A hosted web dashboard where an **agency admin** manages multiple **advertiser**
clients running Amazon DSP campaigns. Each advertiser logs in and sees a curated
view of their own campaign performance. The admin controls, per advertiser,
which data sections are visible. Data is refreshed automatically each night from
Amazon DSP reports.

- **Agency:** Brandography (contact: stevelatart@brandography.com)
- **Scale:** 6 advertisers now, +1–2/month → design for easy onboarding of new advertisers.
- **Refresh cadence:** overnight (ready each morning).

## 2. Users & roles

| Role | Capabilities |
|---|---|
| **Admin** (agency) | Sees all advertisers; creates advertiser accounts; toggles each advertiser's section-level permissions; sets each advertiser's data-source mapping; sees cross-account rollups. |
| **Advertiser** (client) | Logs in, sees ONLY their own data, ONLY the sections the admin enabled. Cannot see other advertisers or admin tools. |

**Hard requirement: strict data isolation.** Every data query must derive the
advertiser identity from the authenticated server session — never from a
client-supplied parameter — so one advertiser can never see another's data.

## 3. Core features

1. **Per-advertiser login** (multi-tenant auth).
2. **Admin permission control** — toggle each data section on/off per advertiser; changes persist and take effect immediately.
3. **Advertiser onboarding** — admin creates an account (name, login email, temp password, data-source mapping) in a couple minutes.
4. **Section-gated dashboard** — advertiser only sees enabled sections in both the nav and the pages.
5. **Overnight automated data refresh** (see §6).

## 4. Data sections

The dashboard is organized into these sections (each independently gate-able per advertiser):

1. **KPIs** — impressions, clicks, CTR, spend, eCPM, CPC, ROAS, conversions, revenue; trend chart + daily table.
2. **Supply & Inventory** — supply source breakdown, win rate, floor price, spend share, format mix.
3. **Audience** — segment performance, unique reach, frequency, in-market vs. lifestyle vs. contextual vs. retargeting.
4. **Line Items & Orders / Tactic Performance** — **the priority view** (see §5).

## 5. PRIORITY: Line Items & Orders report, organized by funnel stage

This is the most important view and should drive the data model. It replaces a
flat "tactics" table with a report structured the way DSP campaigns are actually
planned — by **funnel stage**.

**Grouping / dimensions:**
- **Order** (DSP order/campaign)
- **Line Item** (DSP line item / tactic)
- **Funnel stage:** Awareness → Consideration → Purchase/Conversion (a line item / order belongs to a stage)

**Metrics to report (per line item, and rolled up per funnel stage):**

| Metric | Notes |
|---|---|
| Impressions | |
| Reach | unique users reached — at line-item level (not just audience level) |
| Frequency | avg impressions per user — at line-item level |
| Video completion rate | % of video views completed (100% quartile / "video complete"); for video/OTT line items |
| Conversions (on-Amazon) | purchases/orders attributed on Amazon |
| **Off-Amazon conversions** | pixel/off-site conversions — tracked separately from on-Amazon |

> These last four (funnel stage, line-item reach, line-item frequency, video
> completion, off-Amazon conversions) were NOT in the prototype's data model and
> must be added. See §8.

## 6. Data ingestion architecture (DECIDED)

**Chosen pipeline** (agency liked this; not yet built — deferred):

```
Amazon DSP scheduled email report
   → Google Apps Script (free, time-triggered) parses the email + CSV
      → writes rows into that advertiser's dedicated Google Sheet (tabs per section)
         → app's nightly cron reads each Sheet via a Google service account (read-only)
            → upserts into the app database
               → dashboard renders
```

**Why this pipeline:**
- Avoids Gmail OAuth complexity in the app (Apps Script owns the email side; the app only needs a read-only service account for Sheets).
- One Sheet per advertiser = explicit mapping, no fragile email-subject matching.
- Gives a human review/edit buffer before data is pulled.
- No dependency on Amazon Ads API approval.
- The raw Sheet can optionally be shared with the advertiser too.

**Model:** each advertiser record has a `googleSheetId`. Sheet has tabs named
`KPIs`, `Supply`, `Audience`, `LineItems` with fixed column templates.

**Alternative / future optimization — direct Amazon Ads (DSP) API:**
- Requires: Amazon Ads API approval (gated, slow — the long pole), Login-with-Amazon app (Client ID/Secret + refresh token), each client's DSP advertiser ID.
- Report flow is async: request report → poll → download → parse → upsert.
- Fully automated, freshest data, but more setup and an approval wait. Treat as a later upgrade, not v1.

**Overnight timing:** confirm the cron runs AFTER Amazon delivers the daily
reports (DSP dailies often land early AM). Prototype used `0 6 * * *` UTC — adjust
to the client's timezone and Amazon's delivery time.

## 7. Recommended tech stack

The prototype used the stack below. Reuse it, with the DB fix called out.

- **Framework:** Next.js 14 (App Router), TypeScript.
- **Auth:** NextAuth (credentials provider, JWT sessions). Middleware must set
  `pages.signIn: '/login'` via `withAuth` (default export sends users to the
  ugly `/api/auth/signin` — this was a real bug that was fixed).
- **Styling:** Tailwind CSS.
- **Charts:** Recharts.
- **ORM:** Drizzle.
- **Database:** ⚠️ **Do NOT ship SQLite/better-sqlite3 to Vercel** — serverless
  filesystem is ephemeral/read-only, so writes vanish. Use **Turso/libSQL**
  (closest to SQLite, ~1-file driver swap in Drizzle) or **Postgres**
  (Neon/Supabase/Vercel Postgres). SQLite is fine only for local dev or an
  always-on VPS with a persistent disk.
- **Cron:** Vercel Cron (`vercel.json`) if on Vercel; system cron if on a VPS.

## 8. Data model (extend the prototype's schema)

Prototype tables: `users`, `advertisers`, `permissions`, `kpi_snapshots`,
`supply_snapshots`, `audience_snapshots`, `tactic_snapshots`.

**Add for the funnel line-item report (§5):**
- `advertisers.googleSheetId` (text) — data-source mapping.
- Line-item table needs: `funnelStage` (enum: awareness/consideration/purchase),
  `reach` (int), `frequency` (real), `videoCompletionRate` (real),
  `onAmazonConversions` (int), `offAmazonConversions` (int). Keep existing
  `impressions`, `clicks`, `spend`, `roas`, `orders`, `revenue`, `orderName`,
  `tacticName`/`lineItemName`.

**Permissions table** carries one boolean per section
(`kpis`, `supply`, `audience`, `tactics`/`lineItems`) per advertiser.

**Isolation pattern:** every dashboard query filters by `advertiserId` taken
from the server session. Admin-only API routes check `role === 'ADMIN'`.

## 9. Reference implementation (already prototyped)

A working prototype exists in this repo on branch
`claude/amazon-dsp-dashboard-custom-lfiegr`. It is a solid starting point but:
- Uses SQLite (must migrate for prod — see §7).
- Has KPIs/Supply/Audience/Tactics but NOT the funnel-organized line-item report
  with reach/frequency/video-completion/off-Amazon (must be added — §5, §8).
- Email ingestion was drafted for Gmail parsing; the DECIDED pipeline is the
  Google Sheets one (§6) — replace accordingly.

**Verified working in prototype:** login, session with role + advertiserId,
data isolation (advertiser blocked from admin API), per-section permission
gating, admin permission toggle persisting to DB, cron auth.

**Demo credentials (seed data):**
- Admin: `admin@marketron.com` / `admin123`
- Advertiser: `apex@demo.com` / `advertiser123` (all 6 demo advertisers use `advertiser123`)

**Run locally:** `npm install --ignore-scripts` → `npm run db:seed` → `npm run dev`.

## 10. Production checklist / known gotchas

- [ ] **Database:** migrate off SQLite to Turso or Postgres before deploying to serverless.
- [ ] **Secrets:** generate real `NEXTAUTH_SECRET` and `CRON_SECRET` (prototype used dev placeholders).
- [ ] **Google service account:** create it, share each advertiser's Sheet with its email (read-only), store creds as env vars.
- [ ] **Google Apps Script:** write the script that funnels Amazon DSP emails → per-advertiser Sheets (deliverable for the ingestion step).
- [ ] **Real CSV/report format:** confirm actual Amazon DSP column names — the prototype's column mappings are educated guesses and WILL need alignment to a real export.
- [ ] **Cron timing:** align to Amazon's report delivery time in the client's timezone.
- [ ] **Advertiser password reset / change-password flow:** not built; add for client-facing use.
- [ ] **Idempotent ingestion:** dedupe on (advertiser, date, line item) so a re-run can't duplicate rows.

## 11. Open decisions to confirm before/at build time

1. **Deploy target** → determines DB (Vercel+Turso recommended / Vercel+Postgres / VPS+SQLite).
2. **Funnel-stage source:** how is a line item classified as awareness/consideration/purchase — from the DSP order objective, a naming convention, or a manual mapping in the Sheet?
3. **Off-Amazon conversion source:** which DSP report/column carries off-Amazon (pixel) conversions.
4. **Sheet template:** finalize exact tab names + column headers so the Apps Script and the app reader agree.
5. Whether advertisers also get direct (read-only) access to their raw Google Sheet.
```
