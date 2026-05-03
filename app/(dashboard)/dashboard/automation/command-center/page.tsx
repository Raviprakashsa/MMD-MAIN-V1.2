'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { PauseCircle, PlayCircle, RadioTower, Siren, Workflow } from 'lucide-react'

type StageHealth = 'healthy' | 'warning' | 'critical'

interface PipelineStage {
  id: string
  name: string
  health: StageHealth
  queueDepth: number
  latencyMs: number
}

interface FailurePulse {
  id: number
  x: number
  y: number
  intensity: number
}

interface CommandCenterPayload {
  tick: number
  throughput: number[]
  stages: PipelineStage[]
  pulses: FailurePulse[]
  activeAlerts: number
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

function healthTone(health: StageHealth) {
  if (health === 'critical') return 'bg-rose-50 text-rose-800 border-rose-200'
  if (health === 'warning') return 'bg-amber-50 text-amber-800 border-amber-200'
  return 'bg-emerald-50 text-emerald-800 border-emerald-200'
}

export default function PipelineCommandCenterPage() {
  const prefersReducedMotion = useReducedMotion()
  const [isRunning, setIsRunning] = useState(true)
  const [tick, setTick] = useState(0)
  const [throughput, setThroughput] = useState<number[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [pulses, setPulses] = useState<FailurePulse[]>([])
  const [pipelineRun, setPipelineRun] = useState<PipelineLastRun | null>(null)
  const [externalSources, setExternalSources] = useState<ExternalSourcesTelemetry | null>(null)
  const [isPipelineRunning, setIsPipelineRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTelemetry = useCallback(async () => {
    try {
      const response = await fetch('/api/automation/realtime', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to load telemetry')
      }

      const payload = (await response.json()) as { commandCenter?: CommandCenterPayload; pipeline?: PipelinePayload }
      if (!payload.commandCenter) {
        throw new Error('Telemetry payload missing command center data')
      }

      setTick(payload.commandCenter.tick)
      setThroughput(payload.commandCenter.throughput)
      setStages(payload.commandCenter.stages)
      setPulses(payload.commandCenter.pulses)
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

  const stageHealthSummary = useMemo(() => {
    return {
      healthy: stages.filter((stage) => stage.health === 'healthy').length,
      warning: stages.filter((stage) => stage.health === 'warning').length,
      critical: stages.filter((stage) => stage.health === 'critical').length,
    }
  }, [stages])

  const throughputSeries = throughput.length > 0 ? throughput : [0]
  const currentThroughput = throughputSeries[throughputSeries.length - 1] ?? 0
  const avgThroughput = Math.round(throughputSeries.reduce((sum, value) => sum + value, 0) / throughputSeries.length)
  const activeAlerts = pulses.filter((pulse) => pulse.intensity > 0.68).length

  const liveStatusText = isRunning
    ? `Live mode active. Cycle tick ${tick}. Active alerts ${activeAlerts}.`
    : `Live mode paused at cycle tick ${tick}. Active alerts ${activeAlerts}.`

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
      <p aria-live="polite" className="sr-only">
        {liveStatusText}
      </p>

      <div className="rounded-2xl border border-slate-300 bg-white p-6 text-slate-900 shadow-[0_24px_56px_rgba(15,23,42,0.12)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-100 px-3 py-1 text-xs uppercase tracking-[0.22em] text-cyan-900">
              <RadioTower className="h-3.5 w-3.5" />
              Realtime Automation
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Pipeline Command Center</h1>
            <p className="max-w-2xl text-sm text-slate-700">
              One-screen mission control with an animated spine, stage health chips, throughput ticker, failure pulse map, and live view controls.
            </p>
            {error && (
              <p role="alert" aria-live="polite" className="text-xs font-medium text-rose-700">
                {error}
              </p>
            )}
          </div>

          <button
            onClick={() => setIsRunning((prev) => !prev)}
            aria-pressed={isRunning}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-50 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            {isRunning ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
            {isRunning ? 'Pause Live View' : 'Resume Live View'}
          </button>

          <button
            onClick={runPipelineNow}
            disabled={isPipelineRunning}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-700 bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            {isPipelineRunning ? 'Running Pipeline...' : 'Run Pipeline Now'}
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-700">Current Throughput</p>
            <p className="mt-2 text-3xl font-semibold text-cyan-700">{currentThroughput}<span className="ml-2 text-sm font-normal text-slate-700"> events/min</span></p>
          </div>
          <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-700">Rolling Average</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{avgThroughput}<span className="ml-2 text-sm font-normal text-slate-700"> events/min</span></p>
          </div>
          <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-700">Active Alerts</p>
            <p className="mt-2 text-3xl font-semibold text-rose-700">{activeAlerts}</p>
          </div>
          <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-700">Cycle Tick</p>
            <p className="mt-2 text-3xl font-semibold text-violet-700">{tick}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-4">
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

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section aria-labelledby="pipeline-spine-title" className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800">
            <Workflow className="h-4 w-4" />
            <h2 id="pipeline-spine-title" className="text-lg font-semibold">Animated Pipeline Spine</h2>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-6">
            {stages.map((stage, idx) => (
              <div key={stage.id} className="relative">
                {idx < stages.length - 1 && (
                  <motion.div
                    animate={prefersReducedMotion || !isRunning ? undefined : { opacity: [0.25, 0.9, 0.25] }}
                    transition={prefersReducedMotion || !isRunning ? undefined : { repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                    className="absolute left-[calc(100%-0.5rem)] top-8 hidden h-[2px] w-[calc(100%+0.5rem)] bg-gradient-to-r from-cyan-400/50 to-violet-400/50 md:block"
                  />
                )}

                <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-700">{stage.name}</p>
                  <div className={`mt-2 inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold capitalize ${healthTone(stage.health)}`}>
                    {stage.health}
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-800">
                    <p>Queue: <span className="font-semibold text-slate-800">{stage.queueDepth}</span></p>
                    <p>Latency: <span className="font-semibold text-slate-800">{stage.latencyMs}ms</span></p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 p-3 text-slate-100">
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-200">Throughput Ticker</p>
            <p className="sr-only">Recent throughput values in events per minute: {throughputSeries.join(', ')}</p>
            <div className="relative h-10 overflow-hidden">
              <motion.div
                aria-hidden="true"
                animate={prefersReducedMotion || !isRunning ? undefined : { x: [0, -760] }}
                transition={prefersReducedMotion || !isRunning ? undefined : { repeat: Infinity, duration: 16, ease: 'linear' }}
                className="absolute flex gap-2"
              >
                {[...throughputSeries, ...throughputSeries].map((value, idx) => (
                  <span
                    key={`${value}-${idx}`}
                    className="inline-flex min-w-16 items-center justify-center rounded-md bg-slate-800 px-2 py-1 text-xs text-cyan-100"
                  >
                    {value}
                  </span>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        <section aria-labelledby="failure-map-title" className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Siren className="h-4 w-4 text-rose-500" />
            <h2 id="failure-map-title" className="text-lg font-semibold text-slate-800">Failure Pulse Map</h2>
          </div>

          <div role="img" aria-label="Failure pulse intensity map across telemetry zones" className="mt-4 rounded-xl border border-slate-300 bg-slate-950 p-4">
            <div className="grid grid-cols-6 gap-2">
              {pulses.map((pulse) => {
                const bgOpacity = 0.1 + pulse.intensity * 0.8
                const borderOpacity = 0.2 + pulse.intensity * 0.7
                const scale = 0.9 + pulse.intensity * 0.28
                const isElevated = pulse.intensity > 0.68

                return (
                  <motion.div
                    key={pulse.id}
                    animate={prefersReducedMotion || !isRunning ? undefined : { scale: [scale, scale + 0.14, scale] }}
                    transition={prefersReducedMotion || !isRunning ? undefined : { repeat: Infinity, duration: 1.4 + (pulse.id % 5) * 0.28, ease: 'easeInOut' }}
                    className={`aspect-square rounded-lg border ${isElevated ? 'ring-1 ring-rose-100/70' : ''}`}
                    style={{
                      borderColor: `rgba(251, 113, 133, ${borderOpacity})`,
                      backgroundColor: `rgba(251, 113, 133, ${bgOpacity})`,
                    }}
                  >
                    {isElevated ? <span className="flex h-full items-center justify-center text-[10px] font-bold text-rose-50">!</span> : null}
                  </motion.div>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-slate-100">Cells marked with <span className="font-bold">!</span> indicate elevated pulse intensity.</p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <p className="text-slate-700">Healthy (OK)</p>
              <p className="mt-1 text-lg font-semibold text-emerald-600">{stageHealthSummary.healthy}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <p className="text-slate-700">Warning (Watch)</p>
              <p className="mt-1 text-lg font-semibold text-amber-600">{stageHealthSummary.warning}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <p className="text-slate-700">Critical (Action)</p>
              <p className="mt-1 text-lg font-semibold text-rose-600">{stageHealthSummary.critical}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
