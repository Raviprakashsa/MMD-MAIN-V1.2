'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart, PauseCircle, PlayCircle, Thermometer } from 'lucide-react'

type HeatGrid = number[][]

interface QueueAgeBands {
  fresh: number
  warming: number
  stale: number
  critical: number
}

interface QueueHeatmapPayload {
  tick: number
  timeline: string[]
  stages: string[]
  grid: HeatGrid
  queueAgeBands: QueueAgeBands
  backlogForecast: number[]
}

interface PipelineLastRun {
  id: string
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED'
  trigger: 'MANUAL' | 'CRON' | 'SYSTEM'
  durationMs: number
  totals: {
    processed: number
    succeeded: number
    failed: number
    deadLetter: number
    ingested?: number
  }
  completedAt: string
  errors: string[]
}

interface ExternalSourcesTelemetry {
  activeCount: number
  latestIngested: number
  latestPolled: number
  latestFailed: number
}

interface PipelinePayload {
  lastRun: PipelineLastRun | null
  externalSources?: ExternalSourcesTelemetry
}

function colorForPressure(value: number) {
  if (value >= 80) return 'bg-rose-600 text-rose-50'
  if (value >= 60) return 'bg-orange-500 text-orange-50'
  if (value >= 40) return 'bg-amber-400 text-slate-900'
  if (value >= 20) return 'bg-lime-300 text-slate-900'
  return 'bg-emerald-200 text-emerald-900'
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export default function QueuePressureHeatmapPage() {
  const [isRunning, setIsRunning] = useState(true)
  const [tick, setTick] = useState(0)
  const [timeline, setTimeline] = useState<string[]>([])
  const [stages, setStages] = useState<string[]>([])
  const [grid, setGrid] = useState<HeatGrid>([])
  const [queueAgeBands, setQueueAgeBands] = useState<QueueAgeBands>({ fresh: 0, warming: 0, stale: 0, critical: 0 })
  const [backlogSeries, setBacklogSeries] = useState<number[]>([])
  const [pipelineRun, setPipelineRun] = useState<PipelineLastRun | null>(null)
  const [externalSources, setExternalSources] = useState<ExternalSourcesTelemetry | null>(null)
  const [isPipelineRunning, setIsPipelineRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTelemetry = useCallback(async () => {
    try {
      const response = await fetch('/api/automation/realtime', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to load queue telemetry')
      }

      const payload = (await response.json()) as { queueHeatmap?: QueueHeatmapPayload; pipeline?: PipelinePayload }
      if (!payload.queueHeatmap) {
        throw new Error('Queue telemetry payload missing')
      }

      setTick(payload.queueHeatmap.tick)
      setTimeline(payload.queueHeatmap.timeline)
      setStages(payload.queueHeatmap.stages)
      setGrid(payload.queueHeatmap.grid)
      setQueueAgeBands(payload.queueHeatmap.queueAgeBands)
      setBacklogSeries(payload.queueHeatmap.backlogForecast)
      setPipelineRun(payload.pipeline?.lastRun ?? null)
      setExternalSources(payload.pipeline?.externalSources ?? null)
      setError(null)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load telemetry'
      setError(message)
    }
  }, [])

  useEffect(() => {
    loadTelemetry()
  }, [loadTelemetry])

  useEffect(() => {
    if (!isRunning) return
    const timer = setInterval(loadTelemetry, 10_000)
    return () => clearInterval(timer)
  }, [isRunning, loadTelemetry])

  const stageAverages = useMemo(() => grid.map((row) => Math.round(average(row))), [grid])
  const maxBacklog = Math.max(...backlogSeries, 1)
  const points = backlogSeries
    .map((value, idx) => {
      const x = (idx / (backlogSeries.length - 1)) * 100
      const y = 100 - (value / maxBacklog) * 100
      return `${x},${y}`
    })
    .join(' ')

  const runPipelineNow = useCallback(async () => {
    try {
      setIsPipelineRunning(true)

      const response = await fetch('/api/automation/realtime', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          trigger: 'MANUAL',
          externalSourceLimit: 10,
          reportScheduleLimit: 25,
          exportJobLimit: 15,
          webhookDeliveryLimit: 25,
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to run automation pipeline')
      }

      await loadTelemetry()
      setError(null)
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Failed to run automation pipeline'
      setError(message)
    } finally {
      setIsPipelineRunning(false)
    }
  }, [loadTelemetry])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-teal-300/30 bg-[linear-gradient(120deg,#ecfeff,#f0fdfa_40%,#ecfccb)] p-6 shadow-[0_20px_60px_rgba(16,185,129,0.14)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-white/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-teal-700">
              <Thermometer className="h-3.5 w-3.5" />
              Queue Pressure Intelligence
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Queue Pressure Heatmap</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-700">
              Visualize where queue pressure is building in realtime across stages, age bands, and projected backlog trend.
            </p>
            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
          </div>

          <button
            onClick={() => setIsRunning((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl border border-teal-700/20 bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-600"
          >
            {isRunning ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
            {isRunning ? 'Pause Live Refresh' : 'Resume Live Refresh'}
          </button>

          <button
            onClick={runPipelineNow}
            disabled={isPipelineRunning}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-700 bg-cyan-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPipelineRunning ? 'Running Pipeline...' : 'Run Pipeline Now'}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-700">Last Pipeline Run</p>
          {pipelineRun ? (
            <div className="mt-2 grid gap-2 text-sm text-slate-800 sm:grid-cols-2 xl:grid-cols-4">
              <p>Status: <span className="font-semibold">{pipelineRun.status}</span></p>
              <p>Trigger: <span className="font-semibold">{pipelineRun.trigger}</span></p>
              <p>Processed: <span className="font-semibold">{pipelineRun.totals.processed}</span></p>
              <p>Completed At: <span className="font-semibold">{new Date(pipelineRun.completedAt).toLocaleTimeString()}</span></p>
              <p>External Ingested: <span className="font-semibold">{pipelineRun.totals.ingested ?? 0}</span></p>
              <p>Sources Polled: <span className="font-semibold">{externalSources?.latestPolled ?? 0}</span></p>
              <p>Source Failures: <span className="font-semibold">{externalSources?.latestFailed ?? 0}</span></p>
              <p>Active Sources: <span className="font-semibold">{externalSources?.activeCount ?? 0}</span></p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">No pipeline runs recorded yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Time-by-Stage Heat Grid</h2>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Tick {tick}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Stage</th>
                {timeline.map((label, idx) => (
                  <th key={`${label}-${idx}`} className="px-2 py-2 text-xs font-medium text-slate-500">
                    {label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Avg</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage, rowIdx) => (
                <tr key={stage}>
                  <td className="rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{stage}</td>
                  {grid[rowIdx].map((value, colIdx) => (
                    <td key={`${stage}-${colIdx}`}>
                      <motion.div
                        animate={{ opacity: isRunning ? [0.72, 1, 0.72] : 1 }}
                        transition={{ repeat: Infinity, duration: 2 + (colIdx % 4) * 0.2, ease: 'easeInOut' }}
                        className={`rounded-md px-2 py-2 text-center text-xs font-semibold ${colorForPressure(value)}`}
                      >
                        {value}
                      </motion.div>
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right text-sm font-semibold text-slate-800">{stageAverages[rowIdx]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Queue Age Bands</h2>
          <p className="mt-1 text-sm text-slate-600">Predicted aging profile by current queue pressure.</p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-emerald-700">0-30s</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">{queueAgeBands.fresh}</p>
            </div>
            <div className="rounded-xl border border-lime-200 bg-lime-50 p-4">
              <p className="text-lime-700">31-90s</p>
              <p className="mt-2 text-2xl font-semibold text-lime-900">{queueAgeBands.warming}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-amber-700">91-180s</p>
              <p className="mt-2 text-2xl font-semibold text-amber-900">{queueAgeBands.stale}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-rose-700">180s+</p>
              <p className="mt-2 text-2xl font-semibold text-rose-900">{queueAgeBands.critical}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <LineChart className="h-4 w-4 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">Backlog Forecast Line</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">Projected aggregate backlog for the next 10 minutes.</p>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <svg viewBox="0 0 100 100" className="h-48 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#14b8a6" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
              </defs>
              <polyline
                fill="none"
                stroke="url(#forecastGradient)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            </svg>

            <div className="mt-3 grid grid-cols-5 gap-2 text-xs text-slate-600">
              {backlogSeries.slice(0, 5).map((value, idx) => (
                <div key={`${value}-${idx}`} className="rounded-md bg-white px-2 py-1 text-center shadow-sm">
                  +{idx + 1}m: {value}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
