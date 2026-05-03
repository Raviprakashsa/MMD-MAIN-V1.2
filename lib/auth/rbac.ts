import type { FilterQuery } from 'mongoose'
import type { IUser } from '@/lib/db/models/User'
import type { IRequirement } from '@/lib/db/models/Requirement'
import type { ILead } from '@/lib/db/models/Lead'

export type RoleAwareFilter<T> = FilterQuery<T>

/** User identifier type for RBAC - accepts both string and ObjectId */
type UserIdType = string | { toString(): string }

/**
 * Apply RBAC filter for Leads queries.
 * 
 * Rules:
 * - SUPER_ADMIN / ADMIN: sees all non-deleted leads
 * - COORDINATOR: sees all non-deleted leads (needs full pipeline visibility to manage scrapers)
 * - RECRUITER: Forbidden (no lead access)
 * - SCRAPER: sees only leads assigned to them
 * 
 * Always excludes soft-deleted leads (deletedAt != null)
 */
export function applyLeadRBAC(
  user: { role: IUser['role']; _id?: UserIdType },
  base: RoleAwareFilter<ILead> = {}
): { allowed: boolean; filter: RoleAwareFilter<ILead> } {
  const where: RoleAwareFilter<ILead> = { ...base }

  // RECRUITER role is NOT allowed to view leads
  if (user.role === 'RECRUITER') {
    return { allowed: false, filter: {} }
  }

  // SCRAPER can only see their own assigned leads
  if (user.role === 'SCRAPER') {
    where.assignedTo = user._id?.toString()
  }

  // ADMIN, SUPER_ADMIN, and COORDINATOR can see all leads (no additional filters)

  // Always exclude soft-deleted leads
  if (where.deletedAt === undefined) {
    where.deletedAt = null
  }

  return { allowed: true, filter: where }
}

/**
 * Check if a user can modify a specific lead.
 * 
 * Rules:
 * - ADMIN: can modify any lead
 * - COORDINATOR: can modify any lead
 * - SCRAPER: can only modify leads assigned to them
 * - RECRUITER: cannot modify leads
 */
export function canModifyLead(
  user: { role: IUser['role']; _id?: UserIdType },
  lead: { assignedTo?: string; deletedAt?: Date | null }
): boolean {
  if (lead.deletedAt) return false // Cannot modify deleted leads

  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'COORDINATOR') {
    return true
  }

  if (user.role === 'SCRAPER') {
    return lead.assignedTo === user._id?.toString()
  }

  return false
}

/**
 * Check if a user can convert a lead to a company.
 * Only ADMIN (and SUPER_ADMIN) and COORDINATOR can convert leads.
 */
export function canConvertLead(user: { role: IUser['role'] }): boolean {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'COORDINATOR'
}

/**
 * Check if a user can delete a lead.
 * Only ADMIN and SUPER_ADMIN can delete leads.
 */
export function canDeleteLead(user: { role: IUser['role'] }): boolean {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'
}

export function applyRequirementRBAC(user: Pick<IUser, 'role' | '_id'> & { assignedGroup?: string | null }, base: RoleAwareFilter<IRequirement> = {}) {
  const where: RoleAwareFilter<IRequirement> = { ...base }
  if (user.role === 'RECRUITER') {
    where.accountOwnerId = user._id
  }
  if (user.role === 'COORDINATOR' && user.assignedGroup) {
    where.group = user.assignedGroup.toUpperCase()
  }
  if (user.role === 'SCRAPER') {
    // Scraper should not see requirements; force empty condition
    where._id = { $exists: false }
  }
  if (where.deletedAt === undefined) {
    where.deletedAt = null
  }
  return where
}

export function applyCandidateRBAC(user: Pick<IUser, 'role' | '_id'> & { assignedGroup?: string | null }, base: Record<string, unknown> = {}) {
  const where: Record<string, unknown> = { ...base }
  if (user.role === 'RECRUITER') {
    where['requirement.accountOwnerId'] = user._id
  }
  if (user.role === 'COORDINATOR' && user.assignedGroup) {
    where['requirement.group'] = user.assignedGroup.toUpperCase()
  }
  if (user.role === 'SCRAPER') {
    where._id = { $exists: false }
  }
  where['candidate.deletedAt'] = null
  return where
}

export function applyActivityRBAC(user: Pick<IUser, 'role' | '_id'> & { assignedGroup?: string | null }, base: Record<string, unknown> = {}) {
  const where: Record<string, unknown> = { ...base }
  if (user.role === 'RECRUITER') {
    where.accountOwnerId = user._id
  }
  if (user.role === 'COORDINATOR' && user.assignedGroup) {
    where.group = user.assignedGroup.toUpperCase()
  }
  if (user.role === 'SCRAPER') {
    where._id = { $exists: false }
  }
  return where
}
