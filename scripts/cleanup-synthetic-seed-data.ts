#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import connectDB from '../lib/db/mongodb'
import Requirement from '../lib/db/models/Requirement'
import Activity from '../lib/db/models/Activity'
import Candidate from '../lib/db/models/Candidate'

const SYNTHETIC_ROLE_TITLE_REGEX = /^synthetic role\s+\d+$/i
const SYNTHETIC_ACTIVITY_SUMMARY_REGEX = /^synthetic activity\s+\d+\s+for\s+/i
const LEGACY_FAKE_CANDIDATE_EMAIL_REGEX = /@email\.com$/i

function loadLocalEnv(): void {
  const envPath = join(process.cwd(), '.env')
  const envRegex = /^([^=:#]+)=(.*)$/

  try {
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return

      const match = envRegex.exec(trimmed)
      if (!match) return

      const key = match[1].trim()
      let value = match[2].trim()

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      if (!process.env[key]) {
        process.env[key] = value
      }
    })
  } catch {
    // Local .env is optional.
  }
}

function parseApply(args: string[]): boolean {
  return args.includes('--apply')
}

interface CleanupPlan {
  requirementIds: string[]
  requirementCount: number
  activityCount: number
  candidateCount: number
  activityFilter: Record<string, unknown>
  candidateFilter: Record<string, unknown>
}

async function buildCleanupPlan(): Promise<CleanupPlan> {
  const syntheticRequirements = await Requirement.find({
    $or: [
      { jobTitle: SYNTHETIC_ROLE_TITLE_REGEX },
      { fullDescription: /synthetic requirement generated for uat coverage/i },
    ],
  })
    .select('_id')
    .lean()

  const requirementIds = syntheticRequirements.map((req) => String(req._id))

  const activityFilter: Record<string, unknown> = requirementIds.length > 0
    ? {
      $or: [
        { summary: SYNTHETIC_ACTIVITY_SUMMARY_REGEX },
        { requirementId: { $in: requirementIds } },
      ],
    }
    : { summary: SYNTHETIC_ACTIVITY_SUMMARY_REGEX }

  const candidateFilter: Record<string, unknown> = requirementIds.length > 0
    ? {
      $or: [
        { email: LEGACY_FAKE_CANDIDATE_EMAIL_REGEX },
        { requirementId: { $in: requirementIds } },
      ],
    }
    : { email: LEGACY_FAKE_CANDIDATE_EMAIL_REGEX }

  const [activityCount, candidateCount] = await Promise.all([
    Activity.countDocuments(activityFilter),
    Candidate.countDocuments(candidateFilter),
  ])

  return {
    requirementIds,
    requirementCount: requirementIds.length,
    activityCount,
    candidateCount,
    activityFilter,
    candidateFilter,
  }
}

async function runCleanup(apply: boolean): Promise<void> {
  await connectDB()
  const plan = await buildCleanupPlan()

  console.log('Synthetic seed cleanup plan:')
  console.log(`  requirements to delete: ${plan.requirementCount}`)
  console.log(`  activities to delete: ${plan.activityCount}`)
  console.log(`  candidates to delete: ${plan.candidateCount}`)

  if (!apply) {
    console.log('Dry run complete. Re-run with --apply to execute deletions.')
    return
  }

  const [activityResult, candidateResult, requirementResult] = await Promise.all([
    Activity.deleteMany(plan.activityFilter),
    Candidate.deleteMany(plan.candidateFilter),
    plan.requirementIds.length > 0
      ? Requirement.deleteMany({ _id: { $in: plan.requirementIds } })
      : Promise.resolve({ deletedCount: 0 }),
  ])

  console.log('Cleanup applied:')
  console.log(`  requirements deleted: ${requirementResult.deletedCount ?? 0}`)
  console.log(`  activities deleted: ${activityResult.deletedCount ?? 0}`)
  console.log(`  candidates deleted: ${candidateResult.deletedCount ?? 0}`)
}

async function main(): Promise<void> {
  loadLocalEnv()
  const apply = parseApply(process.argv.slice(2))

  try {
    await runCleanup(apply)
    process.exit(0)
  } catch (error: unknown) {
    console.error('Synthetic seed cleanup failed.', error)
    process.exit(1)
  }
}

void main()
