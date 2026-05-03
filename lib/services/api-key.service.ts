import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import type { Types } from 'mongoose'
import connectDB from '@/lib/db/mongodb'
import ApiKey, { IApiKey } from '@/lib/db/models/ApiKey'
import AuditLog from '@/lib/db/models/AuditLog'
import { AppError, ForbiddenError, NotFoundError, UnauthorizedError } from '@/lib/core/app-error'

export const CreateApiKeySchema = z.object({
  name: z.string().trim().min(2).max(80),
  scopes: z.array(z.string().trim().min(1).max(64)).max(25).optional().default([]),
  expiresAt: z.coerce.date().optional(),
})

export const ListApiKeysSchema = z.object({
  includeRevoked: z.boolean().optional().default(false),
})

export const RotateApiKeySchema = z.object({
  id: z.string().min(1),
})

export const RevokeApiKeySchema = z.object({
  id: z.string().min(1),
})

export const AuthenticateApiKeySchema = z.object({
  token: z.string().trim().min(16),
  requiredScopes: z.array(z.string().trim().min(1).max(64)).optional().default([]),
})

export interface CreateApiKeyInput extends z.infer<typeof CreateApiKeySchema> {}
export interface ListApiKeysInput extends z.infer<typeof ListApiKeysSchema> {}
export interface RotateApiKeyInput extends z.infer<typeof RotateApiKeySchema> {}
export interface RevokeApiKeyInput extends z.infer<typeof RevokeApiKeySchema> {}

interface UserContext {
  id: string
  role: string
}

interface ApiKeyRecord extends IApiKey {
  _id: Types.ObjectId
}

export interface ApiKeyView {
  id: string
  name: string
  keyPrefix: string
  keyPreview: string
  scopes: string[]
  createdBy: string
  revokedAt?: Date | null
  expiresAt?: Date | null
  lastUsedAt?: Date | null
  lastUsedIp?: string | null
  lastUsedUserAgent?: string | null
  createdAt?: Date
  updatedAt?: Date
}

export interface ApiKeyAuthContext {
  keyId: string
  name: string
  scopes: string[]
  createdBy: string
}

export interface AuthenticateApiKeyOptions {
  requiredScopes?: string[]
  ipAddress?: string | null
  userAgent?: string | null
  updateUsage?: boolean
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const

function hasAdminAccess(role: string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role)
}

function normalizeScopes(scopes: string[]): string[] {
  return Array.from(
    new Set(
      scopes
        .map((scope) => scope.trim())
        .filter(Boolean)
    )
  )
}

function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

function generateRawApiKey(): string {
  return `mmd_${randomBytes(32).toString('hex')}`
}

function toApiKeyView(apiKey: ApiKeyRecord): ApiKeyView {
  return {
    id: apiKey._id.toString(),
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    keyPreview: `${apiKey.keyPrefix}...`,
    scopes: apiKey.scopes || [],
    createdBy: apiKey.createdBy.toString(),
    revokedAt: apiKey.revokedAt ?? null,
    expiresAt: apiKey.expiresAt ?? null,
    lastUsedAt: apiKey.lastUsedAt ?? null,
    lastUsedIp: apiKey.lastUsedIp ?? null,
    lastUsedUserAgent: apiKey.lastUsedUserAgent ?? null,
    createdAt: apiKey.createdAt,
    updatedAt: apiKey.updatedAt,
  }
}

export class ApiKeyService {
  static extractTokenFromRequest(request: Request): string | null {
    const directHeader = request.headers.get('x-api-key')?.trim()
    if (directHeader) {
      return directHeader
    }

    const authHeader = request.headers.get('authorization')?.trim()
    if (!authHeader) {
      return null
    }

    const [scheme, ...rest] = authHeader.split(/\s+/)
    const token = rest.join(' ').trim()
    if (!token) {
      return null
    }

    if (/^bearer$/i.test(scheme) || /^apikey$/i.test(scheme)) {
      return token
    }

    return null
  }

  static async create(user: UserContext, data: CreateApiKeyInput) {
    if (!hasAdminAccess(user.role)) throw new ForbiddenError('Forbidden')

    await connectDB()

    const rawKey = generateRawApiKey()
    const normalizedScopes = normalizeScopes(data.scopes || [])

    const created = await ApiKey.create({
      name: data.name.trim(),
      keyPrefix: rawKey.slice(0, 12),
      keyHash: hashApiKey(rawKey),
      scopes: normalizedScopes,
      createdBy: user.id,
      revokedAt: null,
      expiresAt: data.expiresAt ?? null,
      lastUsedAt: null,
      lastUsedIp: null,
      lastUsedUserAgent: null,
    })

    const createdRecord = created.toObject() as ApiKeyRecord

    await AuditLog.create({
      userId: user.id,
      action: 'API_KEY_CREATED',
      entity: 'ApiKey',
      entityId: createdRecord._id.toString(),
      newValue: {
        name: createdRecord.name,
        keyPrefix: createdRecord.keyPrefix,
        scopes: createdRecord.scopes,
        expiresAt: createdRecord.expiresAt,
      },
    })

    return {
      apiKey: toApiKeyView(createdRecord),
      plaintextKey: rawKey,
    }
  }

  static async list(user: UserContext, data: ListApiKeysInput) {
    if (!hasAdminAccess(user.role)) throw new ForbiddenError('Forbidden')

    await connectDB()

    const query: Record<string, unknown> = {}
    if (!data.includeRevoked) {
      query.revokedAt = null
    }

    const apiKeys = await ApiKey.find(query).sort({ createdAt: -1 }).lean()
    return apiKeys.map((apiKey) => toApiKeyView(apiKey as ApiKeyRecord))
  }

  static async rotate(user: UserContext, data: RotateApiKeyInput) {
    if (!hasAdminAccess(user.role)) throw new ForbiddenError('Forbidden')

    await connectDB()

    const apiKey = await ApiKey.findById(data.id)
    if (!apiKey) throw new NotFoundError('API key not found')
    if (apiKey.revokedAt) throw new AppError('Cannot rotate a revoked API key')

    const oldValue = {
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      lastUsedAt: apiKey.lastUsedAt,
    }

    const rawKey = generateRawApiKey()
    apiKey.keyPrefix = rawKey.slice(0, 12)
    apiKey.keyHash = hashApiKey(rawKey)
    apiKey.lastUsedAt = null
    apiKey.lastUsedIp = null
    apiKey.lastUsedUserAgent = null
    await apiKey.save()

    await AuditLog.create({
      userId: user.id,
      action: 'API_KEY_ROTATED',
      entity: 'ApiKey',
      entityId: apiKey._id.toString(),
      oldValue,
      newValue: {
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
      },
    })

    const rotatedRecord = apiKey.toObject() as ApiKeyRecord

    return {
      apiKey: toApiKeyView(rotatedRecord),
      plaintextKey: rawKey,
    }
  }

  static async revoke(user: UserContext, data: RevokeApiKeyInput) {
    if (!hasAdminAccess(user.role)) throw new ForbiddenError('Forbidden')

    await connectDB()

    const apiKey = await ApiKey.findById(data.id)
    if (!apiKey) throw new NotFoundError('API key not found')

    if (apiKey.revokedAt) {
      const revokedRecord = apiKey.toObject() as ApiKeyRecord
      return {
        apiKey: toApiKeyView(revokedRecord),
        alreadyRevoked: true,
      }
    }

    apiKey.revokedAt = new Date()
    await apiKey.save()

    await AuditLog.create({
      userId: user.id,
      action: 'API_KEY_REVOKED',
      entity: 'ApiKey',
      entityId: apiKey._id.toString(),
      oldValue: { revokedAt: null },
      newValue: { revokedAt: apiKey.revokedAt },
    })

    const revokedRecord = apiKey.toObject() as ApiKeyRecord

    return {
      apiKey: toApiKeyView(revokedRecord),
      alreadyRevoked: false,
    }
  }

  static async authenticate(token: string, options: AuthenticateApiKeyOptions = {}): Promise<ApiKeyAuthContext> {
    const parsed = AuthenticateApiKeySchema.parse({
      token,
      requiredScopes: options.requiredScopes || [],
    })

    await connectDB()

    const now = new Date()
    const keyHash = hashApiKey(parsed.token)

    const apiKey = await ApiKey.findOne({
      keyHash,
      revokedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    }).lean()

    if (!apiKey) throw new UnauthorizedError('Invalid API key')

    const normalizedScopes = normalizeScopes(apiKey.scopes || [])
    const requiredScopes = normalizeScopes(parsed.requiredScopes)
    const missingScopes = requiredScopes.filter((scope) => !normalizedScopes.includes(scope))
    if (missingScopes.length > 0) {
      throw new ForbiddenError('API key does not include required scopes')
    }

    if (options.updateUsage !== false) {
      await ApiKey.updateOne(
        { _id: apiKey._id },
        {
          $set: {
            lastUsedAt: now,
            lastUsedIp: options.ipAddress || null,
            lastUsedUserAgent: options.userAgent || null,
          },
        }
      )
    }

    const createdBy = apiKey.createdBy?.toString?.() || ''
    if (!createdBy) {
      throw new AppError('Invalid API key owner metadata')
    }

    return {
      keyId: apiKey._id.toString(),
      name: apiKey.name,
      scopes: normalizedScopes,
      createdBy,
    }
  }
}
