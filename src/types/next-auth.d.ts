import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      role: string
      advertiserId: string | null
      advertiserName: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    advertiserId: string | null
    advertiserName: string | null
  }
}
