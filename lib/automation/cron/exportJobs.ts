import { ExportService } from '@/lib/services/export.service'

export async function runExportJobs(limit = 10) {
  return ExportService.processPendingJobs(
    { id: 'system-cron', role: 'SYSTEM' },
    { limit }
  )
}
