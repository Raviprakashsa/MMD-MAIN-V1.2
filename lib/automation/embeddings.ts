const EMBEDDING_VECTOR_SIZE = 192

interface RequirementEmbeddingSource {
  jobTitle?: string | null
  fullDescription?: string | null
  skills?: string[] | null
  location?: string | null
  workMode?: string | null
}

interface CandidateEmbeddingSource {
  name?: string | null
  skills?: string[] | null
  college?: string | null
  yearsExperience?: number | null
  resumeFileName?: string | null
  requirementKeywords?: string[] | null
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
}

function tokenize(text: string): string[] {
  const normalized = normalizeText(text)
  if (!normalized) {
    return []
  }

  return normalized.split(' ').filter(Boolean)
}

function hashToken(token: string): number {
  let hash = 2166136261
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function l2Normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  if (!norm) {
    return vector
  }

  return vector.map((value) => Number((value / norm).toFixed(8)))
}

function toEmbeddingFromTokens(tokens: string[]): number[] {
  const vector = new Array<number>(EMBEDDING_VECTOR_SIZE).fill(0)

  for (const token of tokens) {
    const hash = hashToken(token)
    const index = hash % EMBEDDING_VECTOR_SIZE
    const sign = (hash & 1) === 0 ? 1 : -1
    vector[index] += sign
  }

  return l2Normalize(vector)
}

function toDistinctSkills(skills: string[] | null | undefined): string[] {
  if (!Array.isArray(skills)) {
    return []
  }

  return Array.from(
    new Set(
      skills
        .map((skill) => normalizeText(skill || ''))
        .filter(Boolean)
    )
  )
}

export function buildRequirementEmbeddingText(source: RequirementEmbeddingSource): string {
  const parts: string[] = []

  if (source.jobTitle) parts.push(source.jobTitle)
  if (source.fullDescription) parts.push(source.fullDescription)
  if (source.location) parts.push(`location ${source.location}`)
  if (source.workMode) parts.push(`work mode ${source.workMode}`)

  const distinctSkills = toDistinctSkills(source.skills)
  if (distinctSkills.length > 0) {
    parts.push(`skills ${distinctSkills.join(' ')}`)
  }

  return parts.join(' ')
}

export function buildCandidateEmbeddingText(source: CandidateEmbeddingSource): string {
  const parts: string[] = []

  if (source.name) parts.push(source.name)
  if (source.college) parts.push(`college ${source.college}`)
  if (source.yearsExperience !== null && source.yearsExperience !== undefined) {
    parts.push(`experience ${source.yearsExperience} years`)
  }
  if (source.resumeFileName) parts.push(`resume ${source.resumeFileName}`)

  const distinctSkills = toDistinctSkills(source.skills)
  if (distinctSkills.length > 0) {
    parts.push(`skills ${distinctSkills.join(' ')}`)
  }

  const requirementKeywords = toDistinctSkills(source.requirementKeywords)
  if (requirementKeywords.length > 0) {
    parts.push(`requirement ${requirementKeywords.join(' ')}`)
  }

  return parts.join(' ')
}

export function generateRequirementEmbedding(source: RequirementEmbeddingSource): number[] {
  const text = buildRequirementEmbeddingText(source)
  const tokens = tokenize(text)
  if (tokens.length === 0) {
    return []
  }

  return toEmbeddingFromTokens(tokens)
}

export function generateCandidateEmbedding(source: CandidateEmbeddingSource): number[] {
  const text = buildCandidateEmbeddingText(source)
  const tokens = tokenize(text)
  if (tokens.length === 0) {
    return []
  }

  return toEmbeddingFromTokens(tokens)
}
