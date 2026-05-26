import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET

if (process.env.NODE_ENV === 'production' && !AUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET or AUTH_SECRET must be set in production')
}

const ADMIN_ONLY = [/^\/admin\//]
const ADMIN_COORDINATOR = [/^\/coordinator\//]
const ADMIN_SCRAPER = [/^\/scraping\//]
const AUTHENTICATED = [/^\/recruiter\//, /^\/dashboard(\/.*)?$/, /^\/(?!login|apply\/).*$/]

function matches(pathname: string, patterns: RegExp[]) {
    return patterns.some((p) => p.test(pathname))
}

export async function proxy(req: NextRequest) {
    const pathname = req.nextUrl.pathname

    if (
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next") ||
        pathname === "/login" ||
        pathname.startsWith("/apply/") ||
        pathname === "/forbidden" ||
        pathname === "/"
    ) {
        return NextResponse.next()
    }

    // Use getToken instead of auth() to avoid Edge Runtime issues with mongoose.
    // If a stale session cookie exists with a different secret, treat it as unauthenticated.
    let token: Awaited<ReturnType<typeof getToken>> = null
    try {
        token = await getToken({ req, secret: AUTH_SECRET })
    } catch {
        token = null
    }

    const requireAuth = matches(pathname, [...ADMIN_ONLY, ...ADMIN_COORDINATOR, ...ADMIN_SCRAPER, ...AUTHENTICATED])

    if (!token && requireAuth) {
        const url = new URL("/login", req.url)
        url.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(url)
    }

    if (!requireAuth) {
        return NextResponse.next()
    }

    const role = token?.role as string | undefined

    if (matches(pathname, ADMIN_ONLY) && role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/forbidden", req.url))
    }

    if (matches(pathname, ADMIN_COORDINATOR) && role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "COORDINATOR") {
        return NextResponse.redirect(new URL("/forbidden", req.url))
    }

    if (matches(pathname, ADMIN_SCRAPER) && role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "SCRAPER") {
        return NextResponse.redirect(new URL("/forbidden", req.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*png$).*)",
    ],
}
