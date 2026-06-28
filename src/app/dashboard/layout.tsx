import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { permissions } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role === 'ADMIN') redirect('/admin')

  const advertiserId = session.user.advertiserId
  const [permission] = advertiserId
    ? await db.select().from(permissions).where(eq(permissions.advertiserId, advertiserId)).limit(1)
    : []

  return (
    <div className="flex min-h-screen">
      <Sidebar
        advertiserName={session.user.advertiserName}
        role={session.user.role}
        permissions={permission ?? null}
      />
      <main className="flex-1 ml-60 p-8">{children}</main>
    </div>
  )
}
