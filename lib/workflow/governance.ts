import connectDB from '@/lib/db/mongodb'
import Candidate from '@/lib/db/models/Candidate'
import Requirement from '@/lib/db/models/Requirement'
import DataAccessLog from '@/lib/db/models/DataAccessLog'

export type DataAccessAction = 'VIEW' | 'EXPORT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE'
export type DataMutationAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE'

interface DataAccessRecord {
  entity: string
  entityId: string
  action: DataAccessAction
}

interface DataMutationRecord {
  entity: string
  entityId: string
  action: DataMutationAction
}

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/

function isObjectId(value: string): boolean {
  return OBJECT_ID_REGEX.test(value)
}

export async function logDataAccess(userId: string, record: DataAccessRecord): Promise<void> {
  if (!isObjectId(userId)) return
  if (!record.entity || !record.entityId) return

  try {
    await connectDB()
    await DataAccessLog.create({
      userId,
      entity: record.entity,
      entityId: record.entityId,
      action: record.action,
    })
  } catch {
    // Access logging should not block business workflows.
  }
}

export async function logDataAccessMany(userId: string, records: DataAccessRecord[]): Promise<void> {
  if (!isObjectId(userId)) return
  if (!Array.isArray(records) || records.length === 0) return

  const sanitized = records
    .filter((record) => Boolean(record.entity && record.entityId))
    .map((record) => ({
      userId,
      entity: record.entity,
      entityId: record.entityId,
      action: record.action,
    }))

  if (sanitized.length === 0) return

  try {
    await connectDB()
    await DataAccessLog.insertMany(sanitized, { ordered: false })
  } catch {
    // Access logging should not block business workflows.
  }
}

export async function logDataMutation(userId: string, record: DataMutationRecord): Promise<void> {
  await logDataAccess(userId, record)
}

export async function softDeleteRequirement(requirementId: string, userId: string) {
  await connectDB()
  await Requirement.findByIdAndUpdate(requirementId, { deletedAt: new Date() })
  await logDataMutation(userId, { entity: 'Requirement', entityId: requirementId, action: 'DELETE' })
}

export async function restoreRequirement(requirementId: string, userId?: string) {
  await connectDB()
  await Requirement.findByIdAndUpdate(requirementId, { deletedAt: null })
  if (userId) {
    await logDataMutation(userId, { entity: 'Requirement', entityId: requirementId, action: 'RESTORE' })
  }
}

export async function softDeleteCandidate(candidateId: string, userId: string) {
  await connectDB()
  await Candidate.findByIdAndUpdate(candidateId, { deletedAt: new Date() })
  await logDataMutation(userId, { entity: 'Candidate', entityId: candidateId, action: 'DELETE' })
}

export async function restoreCandidate(candidateId: string, userId?: string) {
  await connectDB()
  await Candidate.findByIdAndUpdate(candidateId, { deletedAt: null })
  if (userId) {
    await logDataMutation(userId, { entity: 'Candidate', entityId: candidateId, action: 'RESTORE' })
  }
}
