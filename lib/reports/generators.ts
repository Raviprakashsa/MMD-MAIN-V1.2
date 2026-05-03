import connectDB from '@/lib/db/mongodb'
import Activity from '@/lib/db/models/Activity'
import Requirement from '@/lib/db/models/Requirement'
import Candidate from '@/lib/db/models/Candidate'
import Timesheet from '@/lib/db/models/Timesheet'
import Lead from '@/lib/db/models/Lead'
import Company from '@/lib/db/models/Company'
import type { IUser } from '@/lib/db/models/User'
import { applyRequirementRBAC, applyActivityRBAC, applyCandidateRBAC } from '@/lib/auth/rbac'

export type ReportType = 'dailyActivity' | 'requirementStatus' | 'candidatePipeline' | 'timesheet' | 'sourceConversion'

export interface ReportFilters {
  from?: Date
  to?: Date
  userId?: string
  group?: string
  activityType?: string
  status?: string
  companyId?: string
}

function daterange(from?: Date, to?: Date) {
  const range: Record<string, Date> = {}
  if (from) range.$gte = from
  if (to) range.$lte = to
  return Object.keys(range).length ? range : undefined
}

export const reportGenerators = {
  async dailyActivity(filters: ReportFilters, user: Pick<IUser, 'role' | '_id'> & { assignedGroup?: string | null }) {
    await connectDB()
    const base: any = {}
    const time = daterange(filters.from, filters.to)
    if (time) base.createdAt = time
    if (filters.userId) base.userId = filters.userId
    if (filters.activityType) base.type = filters.activityType

    const withRole = applyActivityRBAC(user, base)

    const rows = await Activity.aggregate([
      { $match: withRole },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'requirements',
          localField: 'requirementId',
          foreignField: '_id',
          as: 'requirement',
        },
      },
      { $unwind: '$requirement' },
      {
        $lookup: {
          from: 'companies',
          localField: 'requirement.companyId',
          foreignField: '_id',
          as: 'company',
        },
      },
      { $unwind: '$company' },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          _id: 0,
          user: '$user.name',
          userEmail: '$user.email',
          requirementId: '$requirement.mmdId',
          company: '$company.name',
          type: '$type',
          summary: '$summary',
          outcome: '$outcome',
          createdAt: 1,
          nextFollowUpDate: 1,
        },
      },
    ])

    return rows
  },

  async requirementStatus(filters: ReportFilters, user: Pick<IUser, 'role' | '_id'> & { assignedGroup?: string | null }) {
    await connectDB()
    const base: any = {}
    const createdRange = daterange(filters.from, filters.to)
    if (createdRange) base.createdAt = createdRange
    if (filters.status) base.status = filters.status
    const withRole = applyRequirementRBAC(user, base)

    const rows = await Requirement.aggregate([
      { $match: withRole },
      {
        $lookup: {
          from: 'companies',
          localField: 'companyId',
          foreignField: '_id',
          as: 'company',
        },
      },
      { $unwind: '$company' },
      {
        $lookup: {
          from: 'candidates',
          let: { reqId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$requirementId', '$$reqId'] }, deletedAt: null } },
          ],
          as: 'candidates',
        },
      },
      {
        $lookup: {
          from: 'activities',
          let: { reqId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$requirementId', '$$reqId'] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: 'lastActivity',
        },
      },
      {
        $addFields: {
          candidateCount: { $size: '$candidates' },
          lastActivityAt: { $first: '$lastActivity.createdAt' },
          daysActive: { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 1000 * 60 * 60 * 24] },
        },
      },
      {
        $project: {
          _id: 0,
          mmdId: '$mmdId',
          company: '$company.name',
          jobTitle: '$jobTitle',
          status: '$status',
          daysActive: { $round: ['$daysActive', 0] },
          candidateCount: 1,
          lastActivityAt: 1,
          group: '$group',
          createdAt: 1,
        },
      },
    ])

    return rows
  },

  async candidatePipeline(filters: ReportFilters, user: Pick<IUser, 'role' | '_id'> & { assignedGroup?: string | null }) {
    await connectDB()
    const match: any = { deletedAt: null }
    const appliedRange = daterange(filters.from, filters.to)
    if (appliedRange) match.appliedAt = appliedRange

    const requirementFilter: any = {}
    if (filters.companyId) requirementFilter.companyId = filters.companyId
    const withRole = applyCandidateRBAC(user, { ...requirementFilter })

    const rows = await Candidate.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'requirements',
          localField: 'requirementId',
          foreignField: '_id',
          as: 'requirement',
        },
      },
      { $unwind: '$requirement' },
      { $match: withRole },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ])

    const funnelOrder = ['APPLIED', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'JOINED']
    const totals: Record<string, number> = {}
    rows.forEach((r) => {
      totals[r._id] = r.count
    })

    const ordered = funnelOrder.map((stage) => ({ stage, count: totals[stage] ?? 0 }))
    const applied = ordered[0]?.count ?? 0
    const conversions = ordered.map((stage, idx) => {
      const denom = idx === 0 ? applied || 1 : ordered[idx - 1].count || 1
      return { stage: stage.stage, ratio: stage.count / denom }
    })

    return { funnel: ordered, conversions }
  },

  async timesheet(filters: ReportFilters, user: Pick<IUser, 'role' | '_id'> & { assignedGroup?: string | null }) {
    await connectDB()

    if (user.role === 'SCRAPER') {
      return []
    }

    const match: any = {}
    const range = daterange(filters.from, filters.to)
    if (range) match.date = range
    if (filters.userId) match.userId = filters.userId
    if (user.role === 'RECRUITER') match.userId = user._id

    const pipeline: any[] = [
      { $match: match },
      {
        $lookup: {
          from: 'requirements',
          localField: 'requirementId',
          foreignField: '_id',
          as: 'requirement',
        },
      },
      { $unwind: { path: '$requirement', preserveNullAndEmptyArrays: true } },
    ]

    if (user.role === 'COORDINATOR' && user.assignedGroup) {
      pipeline.push({ $match: { 'requirement.group': user.assignedGroup.toUpperCase() } })
    }

    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $addFields: {
          weekStart: { $dateToString: { format: '%Y-%m-%d', date: { $dateFromParts: { year: { $year: '$date' }, isoWeek: { $isoWeek: '$date' }, isoDayOfWeek: 1 } } } },
        },
      },
      {
        $group: {
          _id: { week: '$weekStart', user: '$userId', requirement: '$requirementId' },
          hours: { $sum: '$hours' },
          userName: { $first: '$user.name' },
          requirement: { $first: '$requirement.mmdId' },
        },
      },
      { $sort: { '_id.week': -1 } },
    )

    const rows = await Timesheet.aggregate(pipeline)

    return rows
  },

  async sourceConversion(filters: ReportFilters) {
    await connectDB()
    const base: any = {}
    const range = daterange(filters.from, filters.to)
    if (range) base.createdAt = range

    const companies = await Company.aggregate([
      { $match: { ...base, deletedAt: null } },
      {
        $lookup: {
          from: 'placements',
          localField: '_id',
          foreignField: 'companyId',
          as: 'placements',
        },
      },
      {
        $group: {
          _id: '$source',
          totalCompanies: { $sum: 1 },
          hires: {
            $sum: {
              $size: {
                $filter: { input: '$placements', as: 'p', cond: { $eq: ['$$p.status', 'JOINED'] } },
              },
            },
          },
        },
      },
    ])

    const leads = await Lead.aggregate([
      { $match: base },
      {
        $group: {
          _id: '$sourcePlatform',
          totalLeads: { $sum: 1 },
          converted: { $sum: { $cond: [{ $ifNull: ['$convertedToCompanyId', false] }, 1, 0] } },
        },
      },
    ])

    return { companies, leads }
  },
}
