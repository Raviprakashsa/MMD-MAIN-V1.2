import { subDays, startOfDay, endOfDay } from 'date-fns'
import connectDB from '@/lib/db/mongodb'
import Requirement from '@/lib/db/models/Requirement'
import Activity from '@/lib/db/models/Activity'
import Notification from '@/lib/db/models/Notification'
import User from '@/lib/db/models/User'
import Company from '@/lib/db/models/Company'

async function notify(userIds: string[], type: 'STALLED_REQ' | 'MISSING_JD' | 'FOLLOW_UP', message: string, link?: string) {
  const docs = userIds.map((uid) => ({ userId: uid, type, message, link, isRead: false }))
  if (!docs.length) return
  await Notification.insertMany(docs)
}

function getRequirementViewHref(requirementId: string): string {
  return `/dashboard/requirements?view=${encodeURIComponent(requirementId)}`
}

export async function runDailyAlerts() {
  await connectDB()
  const admins = await User.find({ role: 'ADMIN', deletedAt: null }).select('_id').lean()
  const adminIds = admins.map((a) => a._id.toString())

  const twoDaysAgo = subDays(new Date(), 2)
  const awaiting = await Requirement.find({ status: 'AWAITING_JD', createdAt: { $lte: twoDaysAgo }, deletedAt: null })
  for (const req of awaiting) {
    const company = await Company.findById(req.companyId)
    const targets = [req.accountOwnerId?.toString(), company?.assignedCoordinatorId?.toString(), ...adminIds].filter(Boolean) as string[]
    await notify(targets, 'MISSING_JD', `JD missing for ${req.mmdId} (${company?.name ?? 'Company'})`, getRequirementViewHref(req._id.toString()))
  }

  const threeDaysAgo = subDays(new Date(), 3)
  const activities = await Activity.aggregate([
    { $match: { createdAt: { $gte: threeDaysAgo } } },
    { $group: { _id: '$requirementId', lastActivity: { $max: '$createdAt' } } },
  ])
  const lastMap = new Map<string, Date>()
  activities.forEach((a) => lastMap.set(String(a._id), a.lastActivity))

  const activeReqs = await Requirement.find({
    status: { $in: ['ACTIVE', 'SOURCING', 'INTERVIEWING'] },
    deletedAt: null,
  })

  const now = new Date()
  for (const req of activeReqs) {
    const last = lastMap.get(String(req._id))
    if (!last) continue
    const daysSince = (now.getTime() - new Date(last).getTime()) / (1000 * 60 * 60 * 24)
    const company = await Company.findById(req.companyId)
    const ownerId = req.accountOwnerId?.toString()
    const coordId = company?.assignedCoordinatorId?.toString()
    if (daysSince >= 7) {
      await notify([ownerId, coordId, ...adminIds].filter(Boolean) as string[], 'STALLED_REQ', `Requirement ${req.mmdId} stalled for ${daysSince.toFixed(0)} days`, getRequirementViewHref(req._id.toString()))
    } else if (daysSince >= 5) {
      await notify([coordId, ownerId].filter(Boolean) as string[], 'STALLED_REQ', `Requirement ${req.mmdId} stalled for ${daysSince.toFixed(0)} days`, getRequirementViewHref(req._id.toString()))
    } else if (daysSince >= 3) {
      await notify([ownerId].filter(Boolean) as string[], 'STALLED_REQ', `Requirement ${req.mmdId} needs attention (inactive ${daysSince.toFixed(0)} days)`, getRequirementViewHref(req._id.toString()))
    }
  }

  const todayStart = startOfDay(new Date())
  const todayEnd = endOfDay(new Date())
  const followups = await Activity.find({ nextFollowUpDate: { $gte: todayStart, $lte: todayEnd }, isCompleted: false })
  const byUser = new Map<string, number>()
  followups.forEach((f) => {
    const uid = f.userId.toString()
    byUser.set(uid, (byUser.get(uid) ?? 0) + 1)
  })
  for (const [uid, count] of Array.from(byUser.entries())) {
    await notify([uid], 'FOLLOW_UP', `You have ${count} follow-ups today`, '/dashboard/activities')
  }
}
