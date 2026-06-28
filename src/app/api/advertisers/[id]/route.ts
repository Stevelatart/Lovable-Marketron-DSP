import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { advertisers } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const updates: Partial<{ emailKeyword: string; dspAccountId: string }> = {}
  if (typeof body.emailKeyword === 'string') updates.emailKeyword = body.emailKeyword
  if (typeof body.dspAccountId === 'string') updates.dspAccountId = body.dspAccountId

  await db.update(advertisers).set(updates).where(eq(advertisers.id, params.id))
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.delete(advertisers).where(eq(advertisers.id, params.id))
  return NextResponse.json({ ok: true })
}
