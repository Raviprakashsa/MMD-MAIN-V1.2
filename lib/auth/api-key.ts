import { UnauthorizedError } from '@/lib/core/app-error'
import { ApiKeyService } from '@/lib/services/api-key.service'

export async function authenticateApiKeyRequest(request: Request, requiredScopes: string[] = []) {
  const token = ApiKeyService.extractTokenFromRequest(request)
  if (!token) {
    throw new UnauthorizedError('Missing API key')
  }

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const userAgent = request.headers.get('user-agent') || null

  return ApiKeyService.authenticate(token, {
    requiredScopes,
    ipAddress,
    userAgent,
  })
}
