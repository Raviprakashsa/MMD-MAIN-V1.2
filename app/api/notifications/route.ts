import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/mongodb'
import Notification from '@/lib/db/models/Notification'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const items = await Notification.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(50).lean()
  return NextResponse.json({ data: items })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const id = body?.id as string | undefined
  await connectDB()
  if (id) {
    await Notification.findOneAndUpdate({ _id: id, userId: session.user.id }, { isRead: true })
  } else {
    await Notification.updateMany({ userId: session.user.id, isRead: false }, { isRead: true })
  }
  return NextResponse.json({ success: true })
}
