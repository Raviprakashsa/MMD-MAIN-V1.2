import IntegrationConfig, { IntegrationProvider } from '@/lib/db/models/IntegrationConfig'

const EXTERNAL_PROVIDERS: IntegrationProvider[] = ['JOB_BOARD', 'ATS']

interface PullSourceInput {
  maxSources: number
  timeoutMs: number
}

export interface ExternalSourcePullSummary {
  polled: number
  succeeded: number
  failed: number
  ingested: number
  errors: string[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function resolveEndpoint(config: Record<string, unknown>): string | null {
  const candidates = [config.url, config.endpoint, config.baseUrl, config.feedUrl]

  for (const candidate of candidates) {
    const value = asString(candidate)?.trim()
    if (value) return value
  }

  return null
}

function resolveMethod(config: Record<string, unknown>): 'GET' | 'POST' {
  const method = asString(config.method)?.trim().toUpperCase()
  if (method === 'POST') return 'POST'
  return 'GET'
}

function resolveHeaders(config: Record<string, unknown>): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  const rawHeaders = asRecord(config.headers)
  if (rawHeaders) {
    for (const [key, value] of Object.entries(rawHeaders)) {
      const parsedValue = asString(value)?.trim()
      if (parsedValue) headers[key] = parsedValue
    }
  }

  const bearerToken = asString(config.bearerToken)?.trim()
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`
  }

  const apiKey = asString(config.apiKey)?.trim()
  const apiKeyHeader = asString(config.apiKeyHeader)?.trim() || 'x-api-key'
  if (apiKey) {
    headers[apiKeyHeader] = apiKey
  }

  return headers
}

function byPath(payload: unknown, path: string): unknown {
  const segments = path
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)

  let current: unknown = payload
  for (const segment of segments) {
    const next = asRecord(current)
    if (!next) return undefined
    current = next[segment]
  }

  return current
}

function countIngested(payload: unknown, config: Record<string, unknown>): number {
  if (Array.isArray(payload)) return payload.length

  const configuredPath = asString(config.resultPath)?.trim()
  if (configuredPath) {
    const result = byPath(payload, configuredPath)
    if (Array.isArray(result)) return result.length
    if (result && typeof result === 'object') return 1
    return 0
  }

  const payloadObj = asRecord(payload)
  if (!payloadObj) return 0

  const commonArrayKeys = ['items', 'results', 'data', 'records', 'jobs', 'candidates']
  for (const key of commonArrayKeys) {
    const value = payloadObj[key]
    if (Array.isArray(value)) return value.length
  }

  return 1
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'External source fetch failed'
}

export class ExternalIntakeService {
  static async pullFromActiveSources(input: PullSourceInput): Promise<ExternalSourcePullSummary> {
    const summary: ExternalSourcePullSummary = {
      polled: 0,
      succeeded: 0,
      failed: 0,
      ingested: 0,
      errors: [],
    }

    const sources = await IntegrationConfig.find({
      isActive: true,
      provider: { $in: EXTERNAL_PROVIDERS },
    })
      .sort({ updatedAt: -1 })
      .limit(input.maxSources)
      .lean()

    for (const source of sources) {
      summary.polled += 1

      const config = asRecord(source.config) || {}
      const endpoint = resolveEndpoint(config)

      if (!endpoint) {
        summary.failed += 1
        summary.errors.push(`${source.name}: missing endpoint URL`)
        continue
      }

      let url: URL
      try {
        url = new URL(endpoint)
      } catch {
        summary.failed += 1
        summary.errors.push(`${source.name}: invalid endpoint URL`)
        continue
      }

      const method = resolveMethod(config)
      const headers = resolveHeaders(config)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), input.timeoutMs)

      try {
        const response = await fetch(url.toString(), {
          method,
          headers,
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const contentType = response.headers.get('content-type') || ''
        const payload = contentType.includes('application/json') ? await response.json() : await response.text()
        const ingested = countIngested(payload, config)

        summary.succeeded += 1
        summary.ingested += ingested
      } catch (error) {
        summary.failed += 1
        summary.errors.push(`${source.name}: ${toErrorMessage(error)}`)
      } finally {
        clearTimeout(timeout)
      }
    }

    return summary
  }
}