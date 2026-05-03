import { NextResponse } from 'next/server'
import mongoose from 'mongoose'

import { auth } from '@/lib/auth'
import { applyRequirementRBAC } from '@/lib/auth/rbac'
import { AppError } from '@/lib/core/app-error'
import connectDB from '@/lib/db/mongodb'
import Requirement from '@/lib/db/models/Requirement'
import { rankCandidatesForRequirement } from '@/lib/automation/matching'
import { logDataAccess, logDataAccessMany } from '@/lib/workflow/governance'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

function parsePositiveInt(value: string | null, fallback: number, min: number, max: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function parseMinScore(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return undefined
  return Math.max(-1, Math.min(1, parsed))
}

function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }

  return NextResponse.json({ error: 'Failed to fetch ranked matches' }, { status: 500 })
}

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role === 'SCRAPER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await context.params
    const searchParams = new URL(request.url).searchParams

    const limit = parsePositiveInt(searchParams.get('limit'), 10, 1, 50)
    const minScore = parseMinScore(searchParams.get('minScore'))

    await connectDB()

    if (!mongoose.Types.ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userObjectId = new mongoose.Types.ObjectId(session.user.id)

    const requirementScope = applyRequirementRBAC(
      {
        role: session.user.role as 'SUPER_ADMIN' | 'ADMIN' | 'COORDINATOR' | 'RECRUITER' | 'SCRAPER',
        _id: userObjectId,
        assignedGroup: null,
      },
      { _id: id }
    )

    const requirement = await Requirement.findOne(requirementScope)
      .select('_id jdEmbedding')
      .lean()

    if (!requirement) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 })
    }

    const matches = await rankCandidatesForRequirement(id, {
      limit,
      minScore,
    })

    await Promise.all([
      logDataAccess(session.user.id, {
        entity: 'Requirement',
        entityId: id,
        action: 'VIEW',
      }),
      logDataAccessMany(
        session.user.id,
        matches.map((match) => ({
          entity: 'Candidate',
          entityId: match.candidateId,
          action: 'VIEW' as const,
        }))
      ),
    ])

    return NextResponse.json({
      data: {
        requirementId: id,
        embeddingReady: Array.isArray(requirement.jdEmbedding) && requirement.jdEmbedding.length > 0,
        totalMatches: matches.length,
        items: matches,
      },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
