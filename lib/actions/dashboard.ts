'use server'

import connectDB from '@/lib/db/mongodb'
import Company from '@/lib/db/models/Company'
import Requirement from '@/lib/db/models/Requirement'
import Candidate from '@/lib/db/models/Candidate'
import Activity from '@/lib/db/models/Activity'
import Timesheet from '@/lib/db/models/Timesheet'
import User from '@/lib/db/models/User'
import { startOfMonth, subDays, startOfDay, endOfDay } from 'date-fns'
import { applyRequirementRBAC } from '@/lib/auth/rbac'
import type { IUser } from '@/lib/db/models/User'

type RoleUser = Pick<IUser, 'role' | '_id'> & { assignedGroup?: string | null }

const OFFER_STUCK_DAYS = Number(process.env.DASHBOARD_OFFER_STUCK_DAYS ?? 5)
const MOU_EXPIRY_DAYS = Number(process.env.DASHBOARD_MOU_EXPIRY_DAYS ?? 5)
const IDLE_ACTIVITY_HOURS = Number(process.env.DASHBOARD_IDLE_ACTIVITY_HOURS ?? 24)
const STALLED_INACTIVITY_DAYS = Number(process.env.DASHBOARD_STALLED_DAYS ?? 15)
const RED_ZONE_RECENCY_DAYS = Number(process.env.DASHBOARD_RED_ZONE_RECENCY_DAYS ?? 45)
const RECENT_ACTIVITY_DAYS = Number(process.env.DASHBOARD_RECENT_ACTIVITY_DAYS ?? 30)
const RECENT_ACTIVITY_FETCH_LIMIT = 50
const RECENT_ACTIVITY_LIMIT = 10
const URGENT_FOLLOW_UP_FETCH_LIMIT = 30
const URGENT_FOLLOW_UP_LIMIT = 10
const SYNTHETIC_ACTIVITY_REGEX = /^synthetic activity\s+\d+\s+for\s+/i
const OPERATIONAL_REQUIREMENT_STATUSES = ['PENDING_INTAKE', 'AWAITING_JD', 'ACTIVE', 'SOURCING', 'INTERVIEWING', 'OFFER', 'ON_HOLD'] as const

interface DashboardActivityRow {
  _id: { toString(): string }
  type: string
  summary: string
  outcome?: string
  createdAt: Date | string
  userName?: string
  requirementMmdId?: string
  requirementTitle?: string
  requirementId?: { toString(): string }
}

interface DashboardFollowUpRow {
  _id: { toString(): string }
  summary: string
  nextFollowUpDate: Date | string
  requirementMmdId?: string
  requirementTitle?: string
  requirementId?: { toString(): string }
  isOverdue?: boolean
}

interface DashboardMetricsOptions {
  range?: '7d' | '30d' | '90d'
  statuses?: string[]
  priorities?: string[]
  teamMember?: 'all' | 'me'
}

function normalizeSummary(summary: string | undefined): string {
  if (!summary) return ''
  return summary.trim().replace(/\s+/g, ' ')
}

function isSyntheticActivity(summary: string): boolean {
  return SYNTHETIC_ACTIVITY_REGEX.test(summary)
}

function sanitizeRecentActivities(items: DashboardActivityRow[]): DashboardActivityRow[] {
  const seen = new Set<string>()
  const cleaned: DashboardActivityRow[] = []

  for (const item of items) {
    const summary = normalizeSummary(item.summary)
    const requirementId = item.requirementId?.toString()

    if (!summary || !requirementId || isSyntheticActivity(summary)) continue

    const dedupeKey = `${item.type}:${summary.toLowerCase()}:${requirementId}:${item.userName || ''}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    cleaned.push({ ...item, summary })
    if (cleaned.length >= RECENT_ACTIVITY_LIMIT) break
  }

  return cleaned
}

function sanitizeUrgentFollowUps(items: DashboardFollowUpRow[]): DashboardFollowUpRow[] {
  const seen = new Set<string>()
  const cleaned: DashboardFollowUpRow[] = []

  for (const item of items) {
    const summary = normalizeSummary(item.summary)
    const requirementId = item.requirementId?.toString()

    if (!summary || !requirementId || isSyntheticActivity(summary)) continue

    const followUpDateKey = item.nextFollowUpDate instanceof Date
      ? item.nextFollowUpDate.toISOString()
      : String(item.nextFollowUpDate || '')
    const dedupeKey = `${summary.toLowerCase()}:${requirementId}:${followUpDateKey}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    cleaned.push({ ...item, summary })
    if (cleaned.length >= URGENT_FOLLOW_UP_LIMIT) break
  }

  return cleaned
}

export async function getDashboardMetrics(user: RoleUser, options?: DashboardMetricsOptions) {
  const requestStartedAt = Date.now()
  await connectDB()

  const now = new Date()
  const selectedRange = options?.range ?? '30d'
  const filteredStatuses = (options?.statuses || []).filter(Boolean)
  const filteredPriorities = (options?.priorities || []).filter(Boolean)
  const selectedTeamMember = options?.teamMember ?? 'all'
  const rangeDays = selectedRange === '7d' ? 7 : selectedRange === '90d' ? 90 : 30
  const rangeStart = subDays(now, rangeDays)
  const monthStart = startOfMonth(now)
  const weekStart = subDays(now, 7)
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const offerStuckCutoff = subDays(now, OFFER_STUCK_DAYS || 5)
  const mouExpiryThreshold = new Date(now.getTime() + (MOU_EXPIRY_DAYS || 5) * 24 * 60 * 60 * 1000)
  const idleActivityCutoff = new Date(now.getTime() - (IDLE_ACTIVITY_HOURS || 24) * 60 * 60 * 1000)
  const stalledCutoff = subDays(now, STALLED_INACTIVITY_DAYS || 15)
  const redZoneRecencyCutoff = subDays(now, RED_ZONE_RECENCY_DAYS || 45)
  const recentActivityCutoff = subDays(now, Math.max(RECENT_ACTIVITY_DAYS || 30, rangeDays))
  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'
  const needsActivityPanels = isAdmin || user.role === 'COORDINATOR'
  const needsFunnel = isAdmin || user.role === 'COORDINATOR'
  const needsTrend = isAdmin

  // Base filters with RBAC + user-selected filters
  const scopedReqFilter: Record<string, unknown> = {}
  if (filteredStatuses.length > 0) scopedReqFilter.status = { $in: filteredStatuses }
  if (filteredPriorities.length > 0) scopedReqFilter.priority = { $in: filteredPriorities }
  if (selectedTeamMember === 'me') scopedReqFilter.accountOwnerId = user._id

  const reqFilter = applyRequirementRBAC(user, scopedReqFilter)

  // Prepare activity RBAC filter once to reuse in all activity queries.
  let activityBaseFilter: Record<string, unknown> = {}
  if (!isAdmin) {
    const allowedReqIds = await Requirement.distinct('_id', reqFilter)
    activityBaseFilter = allowedReqIds.length > 0
      ? { $or: [{ requirementId: { $in: allowedReqIds } }, { userId: user._id }] }
      : { userId: user._id }
  }

  if (selectedTeamMember === 'me') {
    activityBaseFilter = {
      ...activityBaseFilter,
      userId: user._id,
    }
  }

  const hasRequirementScopedFilters = filteredStatuses.length > 0 || filteredPriorities.length > 0 || selectedTeamMember === 'me'
  if (hasRequirementScopedFilters) {
    const filteredReqIds = await Requirement.distinct('_id', reqFilter)
    activityBaseFilter = {
      ...activityBaseFilter,
      requirementId: { $in: filteredReqIds },
    }
  }

  const operationalStatuses = ['PENDING_INTAKE', 'AWAITING_JD', 'ACTIVE', 'SOURCING', 'INTERVIEWING', 'OFFER']
  const filteredOperationalStatuses = filteredStatuses.length > 0
    ? operationalStatuses.filter((status) => filteredStatuses.includes(status))
    : operationalStatuses

  const totalCompaniesPromise = Company.countDocuments({ deletedAt: null })
  const totalCandidatesPromise = Candidate.countDocuments({ deletedAt: null })
  const activeRequirementsPromise = Requirement.countDocuments({
    ...reqFilter,
    status: { $in: filteredOperationalStatuses },
  })
  const activeReqIdsPromise = Activity.distinct('requirementId', {
    createdAt: { $gte: stalledCutoff },
    requirementId: { $ne: null },
  })
  const missingJDCountPromise = filteredStatuses.length > 0 && !filteredStatuses.includes('AWAITING_JD')
    ? Promise.resolve(0)
    : Requirement.countDocuments({
      ...reqFilter,
      status: 'AWAITING_JD',
    })
  const followUpsTodayPromise = Activity.countDocuments({
    ...activityBaseFilter,
    nextFollowUpDate: { $lte: todayEnd },
    isCompleted: false,
  })
  const interviewsThisWeekPromise = Activity.countDocuments({
    ...activityBaseFilter,
    type: 'INTERVIEW',
    createdAt: { $gte: weekStart, $lte: todayEnd },
  })
  const closedStatuses = ['CLOSED_HIRED', 'CLOSED_NOT_HIRED']
  const selectedClosedStatuses = filteredStatuses.length > 0
    ? closedStatuses.filter((status) => filteredStatuses.includes(status))
    : closedStatuses
  const closuresThisMonthPromise = selectedClosedStatuses.length === 0
    ? Promise.resolve(0)
    : Requirement.countDocuments({
      ...reqFilter,
      status: { $in: selectedClosedStatuses },
      updatedAt: { $gte: monthStart },
    })
  const monthCandidatesPromise = Candidate.aggregate([
    {
      $match: {
        deletedAt: null,
        createdAt: { $gte: rangeStart },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]).catch((error) => {
    console.error('Conversion aggregate error:', error)
    return [] as Array<{ _id: string; count: number }>
  })
  const reqByStatusPromise = needsFunnel
    ? Requirement.aggregate([{ $match: { ...reqFilter } }, { $group: { _id: '$status', count: { $sum: 1 } } }])
    : Promise.resolve([] as Array<{ _id: string; count: number }>)
  const reqTrendPromise = needsTrend
    ? Requirement.aggregate([
      {
        $match: {
          ...reqFilter,
          createdAt: { $gte: rangeStart },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          created: { $sum: 1 },
          closed: {
            $sum: { $cond: [{ $in: ['$status', ['CLOSED_HIRED', 'CLOSED_NOT_HIRED']] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ])
    : Promise.resolve([] as Array<{ _id: string; created: number; closed: number }>)
  const recentActivitiesPromise: Promise<DashboardActivityRow[]> = needsActivityPanels
    ? Activity.aggregate([
      {
        $match: {
          ...activityBaseFilter,
          createdAt: { $gte: recentActivityCutoff },
          requirementId: { $ne: null },
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: RECENT_ACTIVITY_FETCH_LIMIT },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'requirements',
          localField: 'requirementId',
          foreignField: '_id',
          as: 'requirement',
        },
      },
      { $unwind: { path: '$requirement', preserveNullAndEmptyArrays: false } },
      {
        $project: {
          _id: 1,
          type: 1,
          summary: 1,
          outcome: 1,
          createdAt: 1,
          userName: '$user.name',
          requirementMmdId: '$requirement.mmdId',
          requirementTitle: '$requirement.jobTitle',
          requirementId: '$requirement._id',
        },
      },
    ])
    : Promise.resolve([])
  const urgentFollowUpsPromise: Promise<DashboardFollowUpRow[]> = needsActivityPanels
    ? Activity.aggregate([
      {
        $match: {
          ...activityBaseFilter,
          requirementId: { $ne: null },
          nextFollowUpDate: { $lte: todayEnd },
          isCompleted: false,
        },
      },
      { $sort: { nextFollowUpDate: 1 } },
      { $limit: URGENT_FOLLOW_UP_FETCH_LIMIT },
      {
        $lookup: {
          from: 'requirements',
          localField: 'requirementId',
          foreignField: '_id',
          as: 'requirement',
        },
      },
      { $unwind: { path: '$requirement', preserveNullAndEmptyArrays: false } },
      {
        $project: {
          _id: 1,
          summary: 1,
          nextFollowUpDate: 1,
          requirementMmdId: '$requirement.mmdId',
          requirementTitle: '$requirement.jobTitle',
          requirementId: '$requirement._id',
          isOverdue: { $lt: ['$nextFollowUpDate', todayStart] },
        },
      },
    ])
    : Promise.resolve([])

  const [
    totalCompanies,
    totalCandidates,
    activeRequirements,
    activeReqIds,
    missingJDCount,
    followUpsToday,
    interviewsThisWeek,
    closuresThisMonth,
    monthCandidates,
    reqByStatus,
    reqTrend,
    recentActivities,
    urgentFollowUps,
  ] = await Promise.all([
    totalCompaniesPromise,
    totalCandidatesPromise,
    activeRequirementsPromise,
    activeReqIdsPromise,
    missingJDCountPromise,
    followUpsTodayPromise,
    interviewsThisWeekPromise,
    closuresThisMonthPromise,
    monthCandidatesPromise,
    reqByStatusPromise,
    reqTrendPromise,
    recentActivitiesPromise,
    urgentFollowUpsPromise,
  ])

  const cleanedRecentActivities = sanitizeRecentActivities(recentActivities)
  const cleanedUrgentFollowUps = sanitizeUrgentFollowUps(urgentFollowUps)

  // Stalled requirements (> configured days no activity)
  const stalledCount = await Requirement.countDocuments({
    ...reqFilter,
    status: { $in: ['ACTIVE', 'SOURCING', 'INTERVIEWING'] },
    _id: { $nin: activeReqIds },
    createdAt: { $lt: stalledCutoff },
  })

  const pendingActions = stalledCount + missingJDCount + followUpsToday

  const totalApplied = monthCandidates.reduce((acc, entry) => acc + entry.count, 0)
  const joined = monthCandidates.find((entry) => entry._id === 'JOINED')?.count || 0
  const conversionRate = totalApplied > 0 ? Math.round((joined / totalApplied) * 100) : 0

  const funnelDefs = [
    { status: 'PENDING_INTAKE', label: 'Pending Intake', color: '#818CF8' },
    { status: 'AWAITING_JD', label: 'Awaiting JD', color: '#6366F1' },
    { status: 'ACTIVE', label: 'Active', color: '#4F46E5' },
    { status: 'SOURCING', label: 'Sourcing', color: '#3B82F6' },
    { status: 'INTERVIEWING', label: 'Interviewing', color: '#2563EB' },
    { status: 'OFFER', label: 'Offer', color: '#0EA5E9' },
    { status: 'ON_HOLD', label: 'On Hold', color: '#F59E0B' },
    { status: 'CLOSED_HIRED', label: 'Closed (Hired)', color: '#22C55E' },
    { status: 'CLOSED_NOT_HIRED', label: 'Closed (Not Hired)', color: '#9CA3AF' },
  ]

  const requirementsFunnel = funnelDefs.map((item) => ({
    label: item.label,
    status: item.status,
    value: reqByStatus.find((r) => r._id === item.status)?.count || 0,
    color: item.color,
  }))

  // Red Zone: high-signal exceptions for admins
  const redZone: Array<{ id: string; title: string; detail: string; href: string; severity: 'high' | 'medium' }> = []

  if (isAdmin) {
    const operationalRequirementFilter = {
      deletedAt: null,
      status: { $in: OPERATIONAL_REQUIREMENT_STATUSES },
      updatedAt: { $gte: redZoneRecencyCutoff },
    }

    const [operationalCompanyIds, operationalOwnerIds] = await Promise.all([
      Requirement.distinct('companyId', operationalRequirementFilter),
      Requirement.distinct('accountOwnerId', operationalRequirementFilter),
    ])

    const [pendingMous, expiringMous, stuckOffers, recruiters, todayActivityByUser] = await Promise.all([
      operationalCompanyIds.length > 0
        ? Company.find({
          _id: { $in: operationalCompanyIds },
          deletedAt: null,
          mouStatus: { $in: ['NOT_STARTED', 'IN_PROGRESS'] },
          updatedAt: { $gte: redZoneRecencyCutoff },
        }).select('name mouStatus').sort({ updatedAt: -1 }).limit(5).lean()
        : Promise.resolve([]),
      operationalCompanyIds.length > 0
        ? Company.find({
          _id: { $in: operationalCompanyIds },
          deletedAt: null,
          mouStatus: 'SIGNED',
          mouEndDate: { $gte: todayStart, $lte: mouExpiryThreshold },
        }).select('name mouEndDate mouStatus').sort({ mouEndDate: 1 }).limit(5).lean()
        : Promise.resolve([]),
      Candidate.aggregate([
        {
          $match: {
            status: 'OFFERED',
            deletedAt: null,
            offeredAt: { $lte: offerStuckCutoff, $gte: redZoneRecencyCutoff },
          },
        },
        { $sort: { offeredAt: 1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'requirements',
            localField: 'requirementId',
            foreignField: '_id',
            as: 'req',
          },
        },
        { $unwind: { path: '$req', preserveNullAndEmptyArrays: false } },
        {
          $project: {
            _id: 1,
            name: 1,
            offeredAt: 1,
            requirementId: '$req._id',
            mmdId: '$req.mmdId',
          },
        },
      ]),
      operationalOwnerIds.length > 0
        ? User.find({
          _id: { $in: operationalOwnerIds },
          role: 'RECRUITER',
          isActive: true,
          deletedAt: null,
        }).select('_id name email').limit(20).lean()
        : Promise.resolve([]),
      operationalOwnerIds.length > 0
        ? Activity.aggregate([
          {
            $match: {
              userId: { $in: operationalOwnerIds },
              createdAt: { $gte: idleActivityCutoff, $lte: todayEnd },
              summary: { $not: SYNTHETIC_ACTIVITY_REGEX },
            },
          },
          { $group: { _id: '$userId', count: { $sum: 1 } } },
        ])
        : Promise.resolve([]),
    ])

    pendingMous.forEach((company) => {
      redZone.push({
        id: `mou-${company._id?.toString()}`,
        title: `MOU pending: ${company.name}`,
        detail: company.mouStatus === 'IN_PROGRESS' ? 'Awaiting admin approval' : 'Awaiting upload',
        href: '/dashboard/companies?mou=expiring',
        severity: 'high',
      })
    })

    expiringMous.forEach((company) => {
      redZone.push({
        id: `mou-expiring-${company._id?.toString()}`,
        title: `MOU expiring: ${company.name}`,
        detail: company.mouEndDate ? `Ends ${new Date(company.mouEndDate).toLocaleDateString()}` : 'Expiry near',
        href: '/dashboard/companies?mou=expiring',
        severity: 'high',
      })
    })

    stuckOffers.forEach((offer) => {
      const label = offer.mmdId ? `${offer.mmdId} offer pending` : `Offer pending >${OFFER_STUCK_DAYS || 5} days`
      redZone.push({
        id: `offer-${offer._id.toString()}`,
        title: label,
        detail: offer.name,
        href: '/dashboard/requirements?status=OFFER',
        severity: 'high',
      })
    })

    const activeUserIds = new Set<string>(todayActivityByUser.map((activity) => activity._id?.toString()))
    const idleRecruiters = recruiters
      .filter((recruiter) => !activeUserIds.has(recruiter._id?.toString() || ''))
      .slice(0, 5)

    idleRecruiters.forEach((recruiter) => {
      redZone.push({
        id: `idle-${recruiter._id?.toString()}`,
        title: `${recruiter.name || 'Recruiter'} has 0 uploads today`,
        detail: 'Nudge for activity',
        href: '/dashboard/leads',
        severity: 'medium',
      })
    })
  }

  // Fetch Audit Logs (Recent Critical Actions)
  // Only for Admins usually, but we are inside getDashboardMetrics which is role-aware.
  // We'll limit this to 5 most recent logs.
  let auditLogs: Array<{
    _id: string
    action: string
    entity: string
    summary: string
    createdAt: Date
    userName: string
  }> = []

  if (isAdmin) {
    try {
      const AuditLog = (await import('@/lib/db/models/AuditLog')).default

      const logs = await AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()

      // Populate user details manually or via simple lookup if needed
      const userIds = [...new Set(logs.map((log) => log.userId?.toString()).filter(Boolean))]
      const users = await User.find({ _id: { $in: userIds } }).select('name').lean()
      const userMap = new Map(users.map((dbUser) => [dbUser._id.toString(), dbUser.name]))

      auditLogs = logs.map((log) => ({
        _id: log._id.toString(),
        action: log.action,
        entity: log.entity,
        summary: `${log.action} on ${log.entity}`, // Simplified summary
        createdAt: log.createdAt ?? now,
        userName: log.userId ? userMap.get(log.userId.toString()) || 'Unknown' : 'System',
      }))
    } catch (error) {
      console.error('Failed to fetch audit logs for dashboard', error)
    }
  }

  // System health is derived from server processing latency to avoid random values.
  const systemHealth = {
    dbStatus: 'connected',
    latency: Math.max(1, Date.now() - requestStartedAt),
    errorRate: 0.1,
  }

  return {
    kpis: {
      totalCompanies,
      totalCandidates,
      activeRequirements,
      pendingActions,
      conversionRate,
      stalledCount,
      missingJDCount,
      pendingJDs: missingJDCount,
      followUpsToday,
      interviewsThisWeek,
      closuresThisMonth,
    },
    requirementsFunnel,
    requirementsTrend: reqTrend.map((r) => ({
      date: new Date(r._id),
      created: r.created,
      closed: r.closed,
    })),
    recentActivities: cleanedRecentActivities.map((a) => ({
      ...a,
      _id: a._id.toString(),
      requirementId: a.requirementId?.toString(),
    })),
    urgentFollowUps: cleanedUrgentFollowUps.map((f) => ({
      ...f,
      _id: f._id.toString(),
      requirementId: f.requirementId?.toString(),
    })),
    redZone,
    auditLogs,
    systemHealth
  }
}

export async function getRecruiterDashboard(userId: string) {
  await connectDB()

  const now = new Date()
  const weekStart = subDays(now, 7)
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  // My open requirements
  const myRequirements = await Requirement.find({
    accountOwnerId: userId,
    status: { $in: ['ACTIVE', 'SOURCING', 'INTERVIEWING'] },
    deletedAt: null,
  })
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean()

  // Today's follow-ups
  const myFollowUps = await Activity.aggregate([
    {
      $match: {
        userId: userId,
        nextFollowUpDate: { $gte: todayStart, $lte: todayEnd },
        isCompleted: false,
      },
    },
    {
      $lookup: {
        from: 'requirements',
        localField: 'requirementId',
        foreignField: '_id',
        as: 'requirement',
      },
    },
    { $unwind: { path: '$requirement', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        summary: 1,
        nextFollowUpDate: 1,
        requirementMmdId: '$requirement.mmdId',
        requirementId: '$requirement._id',
      },
    },
  ])

  // This week's timesheet
  const weekTimesheet = await Timesheet.aggregate([
    {
      $match: {
        userId: userId,
        date: { $gte: weekStart },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        totalHours: { $sum: '$hours' },
      },
    },
    { $sort: { _id: 1 } },
  ])

  const totalWeekHours = weekTimesheet.reduce((acc, d) => acc + d.totalHours, 0)

  return {
    myRequirements: myRequirements.map((r) => ({
      _id: r._id.toString(),
      mmdId: r.mmdId,
      jobTitle: r.jobTitle,
      status: r.status,
    })),
    myFollowUps: myFollowUps.map((f) => ({
      ...f,
      _id: f._id.toString(),
      requirementId: f.requirementId?.toString(),
    })),
    weekTimesheet,
    totalWeekHours,
  }
}
