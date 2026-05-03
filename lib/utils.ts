import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format requirement reference code according to the active staffing spec.
 * Format: REQ-{YY}-{SECTOR}-{SEQUENCE}
 * Example: REQ-24-IT-085
 */
export const REQUIREMENT_ID_SECTOR_CODES: Record<string, string> = {
  IT: 'IT',
  NON_IT: 'NIT',
  CORE: 'COR',
  STARTUP: 'SUP',
  ENTERPRISE: 'ENT',
}

export function getRequirementIdSectorCode(sector: string): string {
  const normalizedSector = sector.trim().toUpperCase()
  const mapped = REQUIREMENT_ID_SECTOR_CODES[normalizedSector]
  if (mapped) return mapped

  const compact = normalizedSector.replace(/[^A-Z]/g, '')
  return compact.slice(0, 3) || 'GEN'
}

export function getRequirementIdPrefix(sector: string, date: Date): string {
  const yearStr = date.getFullYear().toString().slice(-2)
  const sectorCode = getRequirementIdSectorCode(sector)
  return `REQ-${yearStr}-${sectorCode}`
}

export function formatMmdId(sector: string, date: Date, sequence: number): string {
  const seqStr = sequence.toString().padStart(3, '0')
  return `${getRequirementIdPrefix(sector, date)}-${seqStr}`
}

/**
 * Parse a requirement reference code to extract components.
 */
export function parseMmdId(mmdId: string): {
  year: string
  sectorCode: string
  sequence: number
} | null {
  const regex = /^REQ-(\d{2})-([A-Z]{2,3})-(\d{3})$/
  const match = regex.exec(mmdId)
  
  if (!match) return null
  
  return {
    year: match[1],
    sectorCode: match[2],
    sequence: Number.parseInt(match[3], 10)
  }
}
