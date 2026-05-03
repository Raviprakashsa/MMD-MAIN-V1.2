import mongoose, { Model, Schema } from 'mongoose'

export type AutomationPipelineRunStatus = 'COMPLETED' | 'PARTIAL' | 'FAILED'
export type AutomationPipelineTrigger = 'MANUAL' | 'CRON' | 'SYSTEM'

export interface IAutomationPipelineStageSummary {
  processed: number
  succeeded: number
  failed: number
  deadLetter: number
  ingested: number
}

export interface IAutomationPipelineRun {
  _id?: mongoose.Types.ObjectId
  triggeredBy: string
  trigger: AutomationPipelineTrigger
  status: AutomationPipelineRunStatus
  durationMs: number
  limits: {
    externalSources: number
    reportSchedules: number
    exportJobs: number
    webhookDeliveries: number
  }
  stages: {
    externalSources: IAutomationPipelineStageSummary
    reportSchedules: IAutomationPipelineStageSummary
    exportJobs: IAutomationPipelineStageSummary
    webhookDeliveries: IAutomationPipelineStageSummary
  }
  totals: {
    processed: number
    succeeded: number
    failed: number
    deadLetter: number
    ingested: number
  }
  errors: string[]
  startedAt: Date
  completedAt: Date
  createdAt?: Date
  updatedAt?: Date
}

const StageSummarySchema = new Schema<IAutomationPipelineStageSummary>(
  {
    processed: { type: Number, required: true, default: 0 },
    succeeded: { type: Number, required: true, default: 0 },
    failed: { type: Number, required: true, default: 0 },
    deadLetter: { type: Number, required: true, default: 0 },
    ingested: { type: Number, required: true, default: 0 },
  },
  { _id: false }
)

const AutomationPipelineRunSchema = new Schema<IAutomationPipelineRun>(
  {
    triggeredBy: { type: String, required: true },
    trigger: { type: String, enum: ['MANUAL', 'CRON', 'SYSTEM'], required: true },
    status: { type: String, enum: ['COMPLETED', 'PARTIAL', 'FAILED'], required: true },
    durationMs: { type: Number, required: true, min: 0 },
    limits: {
      externalSources: { type: Number, required: true, min: 1, max: 100 },
      reportSchedules: { type: Number, required: true, min: 1, max: 100 },
      exportJobs: { type: Number, required: true, min: 1, max: 100 },
      webhookDeliveries: { type: Number, required: true, min: 1, max: 100 },
    },
    stages: {
      externalSources: { type: StageSummarySchema, required: true },
      reportSchedules: { type: StageSummarySchema, required: true },
      exportJobs: { type: StageSummarySchema, required: true },
      webhookDeliveries: { type: StageSummarySchema, required: true },
    },
    totals: {
      processed: { type: Number, required: true, default: 0 },
      succeeded: { type: Number, required: true, default: 0 },
      failed: { type: Number, required: true, default: 0 },
      deadLetter: { type: Number, required: true, default: 0 },
      ingested: { type: Number, required: true, default: 0 },
    },
    errors: { type: [String], default: [] },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true },
  },
  { timestamps: true, suppressReservedKeysWarning: true }
)

AutomationPipelineRunSchema.index({ createdAt: -1 })
AutomationPipelineRunSchema.index({ status: 1, createdAt: -1 })
AutomationPipelineRunSchema.index({ trigger: 1, createdAt: -1 })

const AutomationPipelineRun: Model<IAutomationPipelineRun> =
  mongoose.models.AutomationPipelineRun ||
  mongoose.model<IAutomationPipelineRun>('AutomationPipelineRun', AutomationPipelineRunSchema)

export default AutomationPipelineRun
