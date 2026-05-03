import { ReportingService } from '@/lib/services/reporting.service'

export async function runReportSchedules(limit = 25) {
  return ReportingService.runScheduledReports(
    { id: 'system-cron', role: 'SYSTEM' },
    { limit }
  )
}
