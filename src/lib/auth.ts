import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from './db'
import { users, advertisers } from './schema'
import { eq } from 'drizzle-orm'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const [user] = await db.select().from(users).where(eq(users.email, credentials.email.toLowerCase())).limit(1)
        if (!user) return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        const [advertiser] = await db.select().from(advertisers).where(eq(advertisers.userId, user.id)).limit(1)

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          advertiserId: advertiser?.id ?? null,
          advertiserName: advertiser?.name ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.advertiserId = (user as any).advertiserId
        token.advertiserName = (user as any).advertiserName
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub
        ;(session.user as any).role = token.role
        ;(session.user as any).advertiserId = token.advertiserId
        ;(session.user as any).advertiserName = token.advertiserName
      }
      return session
    },
  },
}
