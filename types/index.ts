/**
 * User roles
 */
export type UserRole = "SUPER_ADMIN" | "ADMIN" | "COORDINATOR" | "RECRUITER" | "SCRAPER"

/**
 * Extended user type with session information
 */
export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
}

/**
 * Server action response wrapper
 */
export type ActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

/**
 * MMD-ID components
 */
export interface MmdIdComponents {
  group: string
  date: string
  sequence: number
}

/**
 * Audit log action types
 */
export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "IMPORT"

/**
 * Entity types for audit logging
 */
export type EntityType =
  | "User"
  | "Company"
  | "Requirement"
  | "Candidate"
  | "Submission"
  | "Placement"
  | "Contact"
