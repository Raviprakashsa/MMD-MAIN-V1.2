#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import connectDB from '../lib/db/mongodb'
import ExportJob from '../lib/db/models/ExportJob'
import ReportSchedule from '../lib/db/models/ReportSchedule'
import { getRolloutFeatureFlags } from '../lib/core/feature-flags'

interface ReadinessCheck {
  name: string
  ok: boolean
  detail: string
}

function loadLocalEnv(): void {
  const envPath = join(process.cwd(), '.env')
  const envRegex = /^([^=:#]+)=(.*)$/

  try {
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return

      const match = envRegex.exec(trimmed)
      if (!match) return

      const key = match[1].trim()
      let value = match[2].trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      if (!process.env[key]) {
        process.env[key] = value
      }
    })
  } catch {
    // .env is optional if variables are already injected.
  }
}

function printChecks(title: string, checks: ReadinessCheck[]): void {
  console.log(`\n${title}`)
  for (const check of checks) {
    console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}: ${check.detail}`)
  }
}

async function main(): Promise<void> {
  loadLocalEnv()

  console.log('Phase 6 Rollout Readiness Verification')

  const flags = getRolloutFeatureFlags()
  const flagChecks: ReadinessCheck[] = [
    {
      name: 'FEATURE_SEARCH_RBAC_STRICT_MODE',
      ok: flags.searchRbacStrictMode,
      detail: `current=${flags.searchRbacStrictMode}`,
    },
    {
      name: 'FEATURE_CANDIDATE_JOINED_TXN',
      ok: flags.candidateJoinedTransactionalFlow,
      detail: `current=${flags.candidateJoinedTransactionalFlow}`,
    },
    {
      name: 'FEATURE_MANAGED_DOCUMENT_STORAGE',
      ok: flags.managedDocumentStorage,
      detail: `current=${flags.managedDocumentStorage}`,
    },
  ]

  await connectDB()

  const [
    deadLetterExports,
    pendingFailedExports,
    deadLetterSchedules,
    staleScheduleLocks,
  ] = await Promise.all([
    ExportJob.countDocuments({ status: 'DEAD_LETTER' }),
    ExportJob.countDocuments({ status: 'FAILED' }),
    ReportSchedule.countDocuments({ deadLetteredAt: { $ne: null } }),
    ReportSchedule.countDocuments({
      processingStartedAt: {
        $lte: new Date(Date.now() - 15 * 60 * 1000),
      },
      isActive: true,
    }),
  ])

  const operationalChecks: ReadinessCheck[] = [
    {
      name: 'Export dead-letter queue empty',
      ok: deadLetterExports === 0,
      detail: `deadLetterExports=${deadLetterExports}`,
    },
    {
      name: 'No unresolved failed export jobs',
      ok: pendingFailedExports === 0,
      detail: `failedExports=${pendingFailedExports}`,
    },
    {
      name: 'Report dead-letter queue empty',
      ok: deadLetterSchedules === 0,
      detail: `deadLetterSchedules=${deadLetterSchedules}`,
    },
    {
      name: 'No stale active report schedule locks',
      ok: staleScheduleLocks === 0,
      detail: `staleLocks=${staleScheduleLocks}`,
    },
  ]

  const legacyChecks: ReadinessCheck[] = [
    {
      name: 'Legacy requirement actions retired',
      ok: !existsSync(join(process.cwd(), 'lib/actions/requirements.ts')),
      detail: 'lib/actions/requirements.ts should be removed',
    },
    {
      name: 'Legacy workflow action path retired',
      ok: !existsSync(join(process.cwd(), 'lib/actions/module6-workflow.ts')),
      detail: 'lib/actions/module6-workflow.ts should be removed',
    },
  ]

  printChecks('Feature Flag Gates', flagChecks)
  printChecks('Operational Safety Gates', operationalChecks)
  printChecks('Compatibility Cleanup Gates', legacyChecks)

  const allChecks = [...flagChecks, ...operationalChecks, ...legacyChecks]
  const failed = allChecks.filter((check) => !check.ok)

  console.log('\nRollout Summary')
  console.log(`  passed: ${allChecks.length - failed.length}`)
  console.log(`  failed: ${failed.length}`)

  if (failed.length > 0) {
    console.log('\nRecommended actions before rollout:')
    for (const failure of failed) {
      console.log(`  - ${failure.name}`)
    }
    process.exitCode = 1
  } else {
    console.log('\nPhase 6 rollout readiness checks passed.')
  }
}

main().catch((error) => {
  console.error('Rollout readiness verification crashed:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
