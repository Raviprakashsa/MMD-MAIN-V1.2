import { AutomationPipelineService } from '@/lib/services/automation-pipeline.service'

export async function runRealtimeAutomationPipeline(
  externalSourceLimit = 10,
  externalRequestTimeoutMs = 6000,
  reportScheduleLimit = 25,
  exportJobLimit = 15,
  webhookDeliveryLimit = 25
) {
  return AutomationPipelineService.runRealtimePipeline(
    { id: 'system-cron', role: 'SYSTEM' },
    {
      externalSourceLimit,
      externalRequestTimeoutMs,
      reportScheduleLimit,
      exportJobLimit,
      webhookDeliveryLimit,
      trigger: 'CRON',
    }
  )
}
