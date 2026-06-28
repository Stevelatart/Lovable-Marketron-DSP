import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, advertisers, permissions } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const list = await db.select({
    id: advertisers.id,
    name: advertisers.name,
    email: users.email,
    emailKeyword: advertisers.emailKeyword,
    kpis: permissions.kpis,
    supply: permissions.supply,
    audience: permissions.audience,
    tactics: permissions.tactics,
  })
    .from(advertisers)
    .leftJoin(users, eq(advertisers.userId, users.id))
    .leftJoin(permissions, eq(permissions.advertiserId, advertisers.id))

  return NextResponse.json(list)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, email, password, emailKeyword, dspAccountId } = await req.json()
  if (!name || !email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)
  if (existing.length > 0) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

  const hash = await bcrypt.hash(password, 10)
  const userId = randomUUID()
  const advertiserId = randomUUID()

  await db.insert(users).values({ id: userId, email: email.toLowerCase(), password: hash, role: 'ADVERTISER' })
  await db.insert(advertisers).values({ id: advertiserId, name, userId, emailKeyword: emailKeyword ?? '', dspAccountId: dspAccountId ?? '' })
  await db.insert(permissions).values({ id: randomUUID(), advertiserId, kpis: true, supply: false, audience: false, tactics: true })

  return NextResponse.json({ id: advertiserId, name }, { status: 201 })
}
