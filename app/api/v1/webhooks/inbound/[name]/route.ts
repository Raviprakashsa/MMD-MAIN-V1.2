import { NextResponse } from 'next/server'
import connectDB from '@/lib/db/mongodb'
import Webhook from '@/lib/db/models/Webhook'
import User from '@/lib/db/models/User'
import AuditLog from '@/lib/db/models/AuditLog'
import { verifySignature } from '@/lib/middleware/webhookSignature'

interface RouteContext {
  params: Promise<{
    name: string
  }>
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

async function resolveAuditUserId(): Promise<string | null> {
  const fallbackUser = await User.findOne({ role: { $in: ['SUPER_ADMIN', 'ADMIN'] }, deletedAt: null })
    .sort({ createdAt: 1 })
    .select('_id')
    .lean()

  return fallbackUser?._id ? fallbackUser._id.toString() : null
}

export async function POST(request: Request, context: RouteContext) {
  const { name } = await context.params
  if (!name) {
    return NextResponse.json({ error: 'Webhook name is required' }, { status: 400 })
  }

  await connectDB()

  const webhook = await Webhook.findOne({
    name,
    direction: 'IN',
    isActive: true,
  }).lean()

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook endpoint not found' }, { status: 404 })
  }

  const signature = request.headers.get('x-webhook-signature') || request.headers.get('x-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 })
  }

  const rawBody = await request.text()
  const isValidSignature = verifySignature(rawBody, webhook.secret, signature)
  if (!isValidSignature) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  let payload: unknown = {}
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }
  }

  const event = request.headers.get('x-webhook-event')?.trim() || 'UNKNOWN'
  const deliveryId = request.headers.get('x-webhook-delivery-id')?.trim() || null
  const payloadRecord = asRecord(payload)

  const auditUserId = await resolveAuditUserId()
  if (auditUserId) {
    await AuditLog.create({
      userId: auditUserId,
      action: 'WEBHOOK_INBOUND_ACCEPTED',
      entity: 'Webhook',
      entityId: webhook._id.toString(),
      newValue: {
        event,
        deliveryId,
        payloadKeys: payloadRecord ? Object.keys(payloadRecord).slice(0, 30) : [],
      },
    })
  }

  return NextResponse.json({
    success: true,
    event,
    deliveryId,
  })
}
