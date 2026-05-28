import NextAuth, { type DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import connectDB from "@/lib/db/mongodb"
import User, { type UserRole } from "@/lib/db/models/User"
import AuditLog from "@/lib/db/models/AuditLog"

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
      isActive: boolean
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    isActive: boolean
  }
}

// Use explicit secret from env, but provide a stable default for local development
let AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET

if (!AUTH_SECRET && process.env.NODE_ENV !== 'production') {
  // Development fallback secret (do NOT use in production)
  AUTH_SECRET = 'nextauth_dev_fallback_secret_change_me'
}

if (process.env.NODE_ENV === 'production' && !AUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET or AUTH_SECRET must be set in production')
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  // Enable debug logging in non-production to surface detailed auth errors
  debug: process.env.NODE_ENV !== 'production',
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        await connectDB()

        const normalizedEmail =
          typeof credentials.email === "string"
            ? credentials.email.toLowerCase().trim()
            : ""

        const user = await User.findOne({
          email: normalizedEmail,
          deletedAt: null, // Exclude soft-deleted users
          isActive: true,
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        await AuditLog.create({
          userId: user._id,
          action: "USER_AUTHENTICATED",
          entity: "User",
          entityId: user._id.toString(),
          newValue: { email: user.email, role: user.role },
        })

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const mutable = token as typeof token & {
        id?: string
        role?: UserRole
        name?: string
        isActive?: boolean
      }

      if (user) {
        mutable.id = (user as any).id
        mutable.role = (user as any).role
        mutable.name = (user as any).name
        mutable.isActive = (user as any).isActive
      }
      return mutable
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.name = (token as any).name ?? session.user.name
        session.user.isActive = token.isActive as boolean
      }
      return session
    },
  },
})

/**
 * Role-based authorization check
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const session = await auth()

  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  if (!session.user.isActive) {
    throw new Error("Account is inactive")
  }

  if (allowedRoles.includes("ADMIN" as UserRole)) {
    if (!allowedRoles.includes("SUPER_ADMIN" as UserRole)) {
      allowedRoles.push("SUPER_ADMIN" as UserRole)
    }
  }

  if (!allowedRoles.includes(session.user.role)) {
    throw new Error("Forbidden: Insufficient permissions")
  }

  return session
}

/**
 * Get current user from session
 */
export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}
