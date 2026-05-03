interface ThrottleBucket {
  count: number
  resetAt: number
}

interface RequestThrottleConfig {
  keyPrefix: string
  limit: number
  windowMs: number
}

export interface RequestThrottleResult {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
}

declare global {
  var __requestThrottleBuckets: Map<string, ThrottleBucket> | undefined
}

function getThrottleStore(): Map<string, ThrottleBucket> {
  if (!globalThis.__requestThrottleBuckets) {
    globalThis.__requestThrottleBuckets = new Map<string, ThrottleBucket>()
  }

  return globalThis.__requestThrottleBuckets
}

function cleanupExpiredBuckets(store: Map<string, ThrottleBucket>, now: number): void {
  if (store.size < 2000) {
    return
  }

  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key)
    }
  }
}

export function getRequestClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwardedFor) {
    return forwardedFor
  }

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) {
    return realIp
  }

  const cloudflareIp = request.headers.get('cf-connecting-ip')?.trim()
  if (cloudflareIp) {
    return cloudflareIp
  }

  return 'unknown'
}

export function throttleRequest(request: Request, config: RequestThrottleConfig): RequestThrottleResult {
  const now = Date.now()
  const store = getThrottleStore()
  cleanupExpiredBuckets(store, now)

  const ipAddress = getRequestClientIp(request)
  const bucketKey = `${config.keyPrefix}:${ipAddress}`
  const currentBucket = store.get(bucketKey)

  let bucket: ThrottleBucket
  if (!currentBucket || currentBucket.resetAt <= now) {
    bucket = {
      count: 0,
      resetAt: now + config.windowMs,
    }
  } else {
    bucket = currentBucket
  }

  if (bucket.count >= config.limit) {
    store.set(bucketKey, bucket)

    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  bucket.count += 1
  store.set(bucketKey, bucket)

  return {
    allowed: true,
    limit: config.limit,
    remaining: Math.max(0, config.limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  }
}