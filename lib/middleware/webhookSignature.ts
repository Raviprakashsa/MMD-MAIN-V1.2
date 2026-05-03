import crypto from 'node:crypto'

export function createSignature(payload: string, secret: string) {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  return `sha256=${hmac.digest('hex')}`
}

export function verifySignature(payload: string, secret: string, signature: string) {
  const digest = createSignature(payload, secret)
  const digestBuffer = Buffer.from(digest)
  const signatureBuffer = Buffer.from(signature)

  if (digestBuffer.length !== signatureBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(digestBuffer, signatureBuffer)
}
