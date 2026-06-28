import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="flex min-h-screen">
      <Sidebar advertiserName={null} role="ADMIN" permissions={null} />
      <main className="flex-1 ml-60 p-8">{children}</main>
    </div>
  )
}
