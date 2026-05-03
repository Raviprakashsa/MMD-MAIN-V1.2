import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/mongodb'
import Company from '@/lib/db/models/Company'
import Requirement from '@/lib/db/models/Requirement'
import Candidate from '@/lib/db/models/Candidate'
import { applyRequirementRBAC } from '@/lib/auth/rbac'

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function prefixRequirementScope(scope: Record<string, unknown>) {
  const prefixed: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(scope)) {
    if (key.startsWith('$')) {
      prefixed[key] = value
      continue
    }
    prefixed[`requirement.${key}`] = value
  }
  return prefixed
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const rawQuery = searchParams.get('q') ?? ''
  const query = rawQuery.trim().slice(0, 64)

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  await connectDB()

  const regex = new RegExp(escapeRegex(query), 'i')
  const userContext = {
    role: session.user.role as any,
    _id: session.user.id as any,
    assignedGroup: null,
  }
  const requirementScope = applyRequirementRBAC(userContext, {}) as Record<string, unknown>

  const results: {
    id: string
    type: 'company' | 'requirement' | 'candidate'
    title: string
    subtitle: string
    href: string
  }[] = []

  // Search companies (role-aware).
  if (session.user.role !== 'SCRAPER') {
    const companyQuery: Record<string, unknown> = {
      deletedAt: null,
      $or: [{ name: regex }, { sector: regex }],
    }

    if (session.user.role === 'RECRUITER') {
      const accessibleCompanyIds = await Requirement.distinct('companyId', requirementScope)
      companyQuery._id = { $in: accessibleCompanyIds }
    }

    const companies = await Company.find(companyQuery).limit(5).lean()

    companies.forEach((c) => {
      results.push({
        id: c._id.toString(),
        type: 'company',
        title: c.name,
        subtitle: c.sector || 'Company',
        href: `/dashboard/companies/${c._id}`,
      })
    })
  }

  // Search requirements (role-aware).
  const requirements = await Requirement.find({
    ...requirementScope,
    $or: [{ mmdId: regex }, { jobTitle: regex }],
  })
    .limit(5)
    .lean()

  const requirementCompanyIds = [...new Set(requirements.map((r) => r.companyId?.toString()).filter(Boolean))]
  const requirementCompanies = requirementCompanyIds.length
    ? await Company.find({ _id: { $in: requirementCompanyIds } }).select('name').lean()
    : []
  const requirementCompanyMap = new Map(requirementCompanies.map((c) => [c._id.toString(), c.name]))

  for (const r of requirements) {
    results.push({
      id: r._id.toString(),
      type: 'requirement',
      title: `${r.mmdId} - ${r.jobTitle}`,
      subtitle: requirementCompanyMap.get(r.companyId.toString()) || 'Unknown Company',
      href: `/dashboard/requirements?view=${encodeURIComponent(r._id.toString())}`,
    })
  }

  // Search candidates (role-aware by requirement visibility).
  const requirementScopedMatch = prefixRequirementScope(requirementScope)
  const candidates = await Candidate.aggregate([
    {
      $match: {
        deletedAt: null,
        $or: [{ name: regex }, { email: regex }],
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
    { $unwind: '$requirement' },
    { $match: requirementScopedMatch },
    { $sort: { createdAt: -1 } },
    { $limit: 5 },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        requirementMmdId: '$requirement.mmdId',
      },
    },
  ])

  for (const c of candidates as Array<{ _id: unknown; name: string; email: string; requirementMmdId?: string }>) {
    results.push({
      id: String(c._id),
      type: 'candidate',
      title: c.name,
      subtitle: c.requirementMmdId || c.email,
      href: `/dashboard/candidates/${encodeURIComponent(String(c._id))}`,
    })
  }

  return NextResponse.json({ results: results.slice(0, 15) })
}
