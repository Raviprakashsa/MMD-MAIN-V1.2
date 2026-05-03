import { WebhookService } from '@/lib/services/webhook.service'

export async function runWebhookDeliveries(limit = 15) {
  return WebhookService.processPendingDeliveries(
    { id: 'system-cron', role: 'SYSTEM' },
    { limit }
  )
}
