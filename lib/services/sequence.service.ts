import type { ClientSession } from 'mongoose'
import Counter from '@/lib/db/models/Counter'

export async function ensureSequenceFloor(key: string, floor: number, session?: ClientSession | null) {
  if (!Number.isFinite(floor) || floor < 0) return

  await Counter.findOneAndUpdate(
    { key },
    {
      $setOnInsert: { key },
      $max: { value: Math.floor(floor) },
    },
    {
      upsert: true,
      new: true,
      session: session || undefined,
    }
  )
}

export async function getNextSequence(key: string, session?: ClientSession | null) {
  const counter = await Counter.findOneAndUpdate(
    { key },
    {
      $setOnInsert: { key },
      $inc: { value: 1 },
    },
    {
      upsert: true,
      new: true,
      session: session || undefined,
    }
  )

  return counter.value
}
