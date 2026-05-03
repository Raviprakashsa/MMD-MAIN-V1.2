/**
 * Verification Script for Lead Module RBAC
 * 
 * This script verifies that the RBAC rules for the Leads module are correctly enforced:
 * - ADMIN: can see all non-deleted leads
 * - COORDINATOR: can see all non-deleted leads
 * - SCRAPER: can only see leads assigned to them
 * - RECRUITER: cannot see any leads (forbidden)
 * - deletedAt leads are never returned
 * 
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/verify-lead-rbac.ts
 * Or: npx tsx scripts/verify-lead-rbac.ts
 */

import { applyLeadRBAC, canModifyLead, canConvertLead, canDeleteLead } from '../lib/auth/rbac'

// Test helper
function test(name: string, fn: () => boolean) {
  const result = fn()
  console.log(`${result ? '✅' : '❌'} ${name}`)
  return result
}

console.log('\n🔐 Lead Module RBAC Verification\n')
console.log('=' .repeat(50))

let passed = 0
let failed = 0

// ======================
// applyLeadRBAC Tests
// ======================
console.log('\n📋 applyLeadRBAC Tests\n')

// Test 1: ADMIN sees all non-deleted leads
if (test('ADMIN: allowed=true, no assignedTo filter', () => {
  const user = { role: 'ADMIN' as const, _id: 'admin-123' }
  const { allowed, filter } = applyLeadRBAC(user)
  return allowed === true && filter.assignedTo === undefined && filter.deletedAt === null
})) passed++; else failed++;

// Test 2: COORDINATOR sees all non-deleted leads
if (test('COORDINATOR: allowed=true, no assignedTo filter', () => {
  const user = { role: 'COORDINATOR' as const, _id: 'coord-123' }
  const { allowed, filter } = applyLeadRBAC(user)
  return allowed === true && filter.assignedTo === undefined && filter.deletedAt === null
})) passed++; else failed++;

// Test 3: SCRAPER only sees own leads
if (test('SCRAPER: allowed=true, assignedTo filter applied', () => {
  const user = { role: 'SCRAPER' as const, _id: 'scraper-456' }
  const { allowed, filter } = applyLeadRBAC(user)
  return allowed === true && filter.assignedTo === 'scraper-456' && filter.deletedAt === null
})) passed++; else failed++;

// Test 4: RECRUITER is forbidden
if (test('RECRUITER: allowed=false (forbidden)', () => {
  const user = { role: 'RECRUITER' as const, _id: 'recruiter-789' }
  const { allowed } = applyLeadRBAC(user)
  return allowed === false
})) passed++; else failed++;

// Test 5: deletedAt filter always applied
if (test('All roles: deletedAt=null filter always applied', () => {
  const adminResult = applyLeadRBAC({ role: 'ADMIN' as const, _id: '1' })
  const coordResult = applyLeadRBAC({ role: 'COORDINATOR' as const, _id: '2' })
  const scraperResult = applyLeadRBAC({ role: 'SCRAPER' as const, _id: '3' })
  return (
    adminResult.filter.deletedAt === null &&
    coordResult.filter.deletedAt === null &&
    scraperResult.filter.deletedAt === null
  )
})) passed++; else failed++;

// Test 6: Base filter is preserved
if (test('Base filter preserved (status filter)', () => {
  const user = { role: 'ADMIN' as const, _id: 'admin-123' }
  const { filter } = applyLeadRBAC(user, { status: 'NEW' })
  return filter.status === 'NEW' && filter.deletedAt === null
})) passed++; else failed++;

// ======================
// canModifyLead Tests
// ======================
console.log('\n📝 canModifyLead Tests\n')

// Test 7: ADMIN can modify any lead
if (test('ADMIN: can modify any lead', () => {
  const user = { role: 'ADMIN' as const, _id: 'admin-123' }
  return canModifyLead(user, { assignedTo: 'other-user' })
})) passed++; else failed++;

// Test 8: COORDINATOR can modify any lead
if (test('COORDINATOR: can modify any lead', () => {
  const user = { role: 'COORDINATOR' as const, _id: 'coord-123' }
  return canModifyLead(user, { assignedTo: 'other-user' })
})) passed++; else failed++;

// Test 9: SCRAPER can modify own leads
if (test('SCRAPER: can modify own leads', () => {
  const user = { role: 'SCRAPER' as const, _id: 'scraper-456' }
  return canModifyLead(user, { assignedTo: 'scraper-456' })
})) passed++; else failed++;

// Test 10: SCRAPER cannot modify others' leads
if (test('SCRAPER: cannot modify others\' leads', () => {
  const user = { role: 'SCRAPER' as const, _id: 'scraper-456' }
  return canModifyLead(user, { assignedTo: 'other-scraper' }) === false
})) passed++; else failed++;

// Test 11: RECRUITER cannot modify leads
if (test('RECRUITER: cannot modify any leads', () => {
  const user = { role: 'RECRUITER' as const, _id: 'recruiter-789' }
  return canModifyLead(user, { assignedTo: 'recruiter-789' }) === false
})) passed++; else failed++;

// Test 12: Cannot modify deleted leads
if (test('All roles: cannot modify deleted leads', () => {
  const admin = { role: 'ADMIN' as const, _id: 'admin-123' }
  const deletedLead = { assignedTo: 'anyone', deletedAt: new Date() }
  return canModifyLead(admin, deletedLead) === false
})) passed++; else failed++;

// ======================
// canConvertLead Tests
// ======================
console.log('\n🔄 canConvertLead Tests\n')

// Test 13: ADMIN can convert
if (test('ADMIN: can convert leads', () => {
  return canConvertLead({ role: 'ADMIN' })
})) passed++; else failed++;

// Test 14: COORDINATOR can convert
if (test('COORDINATOR: can convert leads', () => {
  return canConvertLead({ role: 'COORDINATOR' })
})) passed++; else failed++;

// Test 15: SCRAPER cannot convert
if (test('SCRAPER: cannot convert leads', () => {
  return canConvertLead({ role: 'SCRAPER' }) === false
})) passed++; else failed++;

// Test 16: RECRUITER cannot convert
if (test('RECRUITER: cannot convert leads', () => {
  return canConvertLead({ role: 'RECRUITER' }) === false
})) passed++; else failed++;

// ======================
// canDeleteLead Tests
// ======================
console.log('\n🗑️ canDeleteLead Tests\n')

// Test 17: ADMIN can delete
if (test('ADMIN: can delete leads', () => {
  return canDeleteLead({ role: 'ADMIN' })
})) passed++; else failed++;

// Test 18: COORDINATOR can delete
if (test('COORDINATOR: can delete leads', () => {
  return canDeleteLead({ role: 'COORDINATOR' })
})) passed++; else failed++;

// Test 19: SCRAPER cannot delete
if (test('SCRAPER: cannot delete leads', () => {
  return canDeleteLead({ role: 'SCRAPER' }) === false
})) passed++; else failed++;

// Test 20: RECRUITER cannot delete
if (test('RECRUITER: cannot delete leads', () => {
  return canDeleteLead({ role: 'RECRUITER' }) === false
})) passed++; else failed++;

// ======================
// Summary
// ======================
console.log('\n' + '='.repeat(50))
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`)

if (failed > 0) {
  console.log('❌ Some tests failed. Please review the RBAC implementation.\n')
  process.exit(1)
} else {
  console.log('✅ All RBAC rules are correctly enforced!\n')
  console.log('RBAC Rules Summary:')
  console.log('  • ADMIN: Full access to all leads')
  console.log('  • COORDINATOR: Full access to all leads')
  console.log('  • SCRAPER: View/modify only assigned leads')
  console.log('  • RECRUITER: No lead access (forbidden)')
  console.log('  • Soft-deleted leads (deletedAt ≠ null): Always excluded\n')
  process.exit(0)
}
