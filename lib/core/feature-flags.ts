function parseBooleanFlag(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined) {
    return defaultValue
  }

  const normalized = raw.trim().toLowerCase()
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true
  }

  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false
  }

  return defaultValue
}

export interface RolloutFeatureFlags {
  searchRbacStrictMode: boolean
  candidateJoinedTransactionalFlow: boolean
  managedDocumentStorage: boolean
}

export function getRolloutFeatureFlags(): RolloutFeatureFlags {
  return {
    searchRbacStrictMode: parseBooleanFlag(process.env.FEATURE_SEARCH_RBAC_STRICT_MODE, true),
    candidateJoinedTransactionalFlow: parseBooleanFlag(process.env.FEATURE_CANDIDATE_JOINED_TXN, true),
    managedDocumentStorage: parseBooleanFlag(process.env.FEATURE_MANAGED_DOCUMENT_STORAGE, true),
  }
}
