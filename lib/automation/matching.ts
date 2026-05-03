import connectDB from '@/lib/db/mongodb'
import Requirement from '@/lib/db/models/Requirement'
import Candidate from '@/lib/db/models/Candidate'

interface RankedCandidateMatch {
  candidateId: string
  name: string
  email: string
  status: string
  score: number
}

interface MatchCandidatesOptions {
  limit?: number
  minScore?: number
}

function cosine(a: number[], b: number[]): number {
  const dot = a.reduce((acc, v, i) => acc + v * (b[i] ?? 0), 0)
  const normA = Math.sqrt(a.reduce((acc, v) => acc + v * v, 0))
  const normB = Math.sqrt(b.reduce((acc, v) => acc + v * v, 0))
  if (!normA || !normB) return 0
  return dot / (normA * normB)
}

export async function rankCandidatesForRequirement(
  requirementId: string,
  options: MatchCandidatesOptions = {}
): Promise<RankedCandidateMatch[]> {
  await connectDB()

  const limit = Math.min(50, Math.max(1, options.limit ?? 10))
  const minScore = Number.isFinite(options.minScore) ? (options.minScore as number) : -1

  const req = await Requirement.findOne({ _id: requirementId, deletedAt: null })
    .select('jdEmbedding')
    .lean()
  if (!req?.jdEmbedding || !Array.isArray(req.jdEmbedding)) return []

  const jdEmbedding: number[] = req.jdEmbedding

  const candidates = await Candidate.find({
    requirementId,
    deletedAt: null,
    embedding: { $exists: true },
  })
    .select('name email status embedding')
    .lean()

  const scored = candidates
    .filter((candidate) => Array.isArray(candidate.embedding) && candidate.embedding.length > 0)
    .map((candidate) => ({
      candidateId: candidate._id.toString(),
      name: candidate.name,
      email: candidate.email,
      status: candidate.status,
      score: cosine(jdEmbedding, candidate.embedding as number[]),
    }))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored
}

export async function matchCandidateToJD(requirementId: string, limit = 10): Promise<RankedCandidateMatch[]> {
  return rankCandidatesForRequirement(requirementId, { limit })
}
