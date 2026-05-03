import connectDB from '@/lib/db/mongodb'
import Candidate from '@/lib/db/models/Candidate'
import Requirement from '@/lib/db/models/Requirement'
import { generateCandidateEmbedding, generateRequirementEmbedding } from '@/lib/automation/embeddings'

type Scope = 'requirements' | 'candidates' | 'all'

interface BackfillStats {
  scanned: number
  alreadyPopulated: number
  eligible: number
  updated: number
  skipped: number
}

function logLine(message: string): void {
  process.stdout.write(`${message}\n`)
}

function hasEmbedding(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

function parseScope(value: string | undefined): Scope {
  if (value === 'requirements' || value === 'candidates' || value === 'all') {
    return value
  }

  return 'all'
}

function parseArgs(argv: string[]) {
  const apply = argv.includes('--apply')
  const scopeArg = argv.find((arg) => arg.startsWith('--scope='))
  const scope = parseScope(scopeArg?.split('=')[1])
  const limitArg = argv.find((arg) => arg.startsWith('--limit='))
  const parsedLimit = Number.parseInt(limitArg?.split('=')[1] ?? '', 10)
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined

  return {
    apply,
    scope,
    limit,
  }
}

async function backfillRequirements(apply: boolean, limit?: number): Promise<BackfillStats> {
  const stats: BackfillStats = {
    scanned: 0,
    alreadyPopulated: 0,
    eligible: 0,
    updated: 0,
    skipped: 0,
  }

  const query = Requirement.find({ deletedAt: null })
    .select('jobTitle fullDescription skills location workMode jdEmbedding')
    .sort({ createdAt: 1 })

  if (limit) {
    query.limit(limit)
  }

  const requirements = await query.lean()
  stats.scanned = requirements.length

  for (const requirement of requirements) {
    if (hasEmbedding(requirement.jdEmbedding)) {
      stats.alreadyPopulated += 1
      continue
    }

    const embedding = generateRequirementEmbedding({
      jobTitle: requirement.jobTitle,
      fullDescription: requirement.fullDescription,
      skills: requirement.skills,
      location: requirement.location,
      workMode: requirement.workMode,
    })

    if (embedding.length === 0) {
      stats.skipped += 1
      continue
    }

    stats.eligible += 1

    if (apply) {
      await Requirement.updateOne(
        { _id: requirement._id },
        { $set: { jdEmbedding: embedding } }
      )
      stats.updated += 1
    }
  }

  return stats
}

async function backfillCandidates(apply: boolean, limit?: number): Promise<BackfillStats> {
  const stats: BackfillStats = {
    scanned: 0,
    alreadyPopulated: 0,
    eligible: 0,
    updated: 0,
    skipped: 0,
  }

  const query = Candidate.find({ deletedAt: null })
    .select('name skills college yearsExperience resumeFileName embedding')
    .sort({ createdAt: 1 })

  if (limit) {
    query.limit(limit)
  }

  const candidates = await query.lean()
  stats.scanned = candidates.length

  for (const candidate of candidates) {
    if (hasEmbedding(candidate.embedding)) {
      stats.alreadyPopulated += 1
      continue
    }

    const embedding = generateCandidateEmbedding({
      name: candidate.name,
      skills: candidate.skills,
      college: candidate.college,
      yearsExperience: candidate.yearsExperience,
      resumeFileName: candidate.resumeFileName,
    })

    if (embedding.length === 0) {
      stats.skipped += 1
      continue
    }

    stats.eligible += 1

    if (apply) {
      await Candidate.updateOne(
        { _id: candidate._id },
        { $set: { embedding } }
      )
      stats.updated += 1
    }
  }

  return stats
}

function printStats(label: string, stats: BackfillStats, apply: boolean): void {
  logLine(`\n[${label}]`)
  logLine(`  scanned: ${stats.scanned}`)
  logLine(`  alreadyPopulated: ${stats.alreadyPopulated}`)
  logLine(`  eligible: ${stats.eligible}`)
  logLine(`  skipped: ${stats.skipped}`)
  logLine(`  ${apply ? 'updated' : 'wouldUpdate'}: ${apply ? stats.updated : stats.eligible}`)
}

async function run(): Promise<void> {
  const { apply, scope, limit } = parseArgs(process.argv.slice(2))

  logLine('Embedding Backfill Runner')
  logLine(`mode: ${apply ? 'apply' : 'dry-run'}`)
  logLine(`scope: ${scope}`)
  if (limit) {
    logLine(`limit: ${limit}`)
  }

  await connectDB()

  if (scope === 'requirements' || scope === 'all') {
    const requirementStats = await backfillRequirements(apply, limit)
    printStats('requirements', requirementStats, apply)
  }

  if (scope === 'candidates' || scope === 'all') {
    const candidateStats = await backfillCandidates(apply, limit)
    printStats('candidates', candidateStats, apply)
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`Embedding backfill failed: ${message}\n`)
  process.exitCode = 1
})
