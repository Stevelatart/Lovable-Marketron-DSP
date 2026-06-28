import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { permissions } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['kpis', 'supply', 'audience', 'tactics'] as const
  const updates: Partial<Record<typeof allowed[number], boolean>> = {}
  for (const key of allowed) {
    if (typeof body[key] === 'boolean') updates[key] = body[key]
  }

  await db.update(permissions).set({ ...updates, updatedAt: new Date() }).where(eq(permissions.advertiserId, params.id))
  return NextResponse.json({ ok: true })
}
