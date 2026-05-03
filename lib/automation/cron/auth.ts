import { timingSafeEqual } from 'node:crypto'

export type CronAuthorizationResult =
  | { ok: true }
  | { ok: false; status: number; error: string }

function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null
  }

  const [scheme, token, ...rest] = authorizationHeader.trim().split(' ')
  if (rest.length > 0 || scheme !== 'Bearer' || !token) {
    return null
  }

  return token
}

function safeTokenEquals(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)

  if (expectedBuffer.length !== providedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, providedBuffer)
}

export function authorizeCronRequest(request: Request): CronAuthorizationResult {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return { ok: false, status: 500, error: 'CRON_SECRET is not configured' }
  }

  const providedToken = extractBearerToken(request.headers.get('authorization'))
  if (!providedToken || !safeTokenEquals(cronSecret, providedToken)) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  return { ok: true }
}
