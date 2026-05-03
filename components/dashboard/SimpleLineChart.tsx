'use client'

import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { useId, useState } from 'react'

interface LineChartProps {
  data: {
    date: Date
    created: number
    closed: number
  }[]
  title?: string
}

export function SimpleLineChart({ data, title }: Readonly<LineChartProps>) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const id = useId()

  // Dimensions
  const height = 300
  const width = 800
  const paddingX = 60
  const paddingY = 40
  const chartHeight = height - paddingY * 2
  const chartWidth = width - paddingX * 2

  // Scales
  const maxValue = Math.max(...data.flatMap((d) => [d.created, d.closed]), 5) // Min cap to avoid flat line
  const paddedMax = Math.ceil(maxValue * 1.1)

  const getX = (index: number) => paddingX + (index / (data.length - 1 || 1)) * chartWidth
  const getY = (value: number) => height - paddingY - (value / paddedMax) * chartHeight

  // Path Generator (Bezier)
  const createPath = (dataset: number[]) => {
    if (dataset.length === 0) return ''

    // First point
    let d = `M ${getX(0)} ${getY(dataset[0])}`

    // Smooth curves
    for (let i = 0; i < dataset.length - 1; i++) {
      const x0 = getX(i)
      const y0 = getY(dataset[i])
      const x1 = getX(i + 1)
      const y1 = getY(dataset[i + 1])

      // Control points for bezier (simple smoothing)
      const cp1x = x0 + (x1 - x0) * 0.5
      const cp1y = y0
      const cp2x = x1 - (x1 - x0) * 0.5
      const cp2y = y1

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x1} ${y1}`
    }
    return d
  }

  const createAreaPath = (dataset: number[]) => {
    const line = createPath(dataset)
    return `${line} L ${getX(dataset.length - 1)} ${height - paddingY} L ${getX(0)} ${height - paddingY} Z`
  }

  const createdData = data.map(d => d.created)
  const closedData = data.map(d => d.closed)

  return (
    <div className="w-full h-full flex flex-col pt-2">
      {title && <h3 className="text-lg font-bold text-slate-800 mb-4 px-2">{title}</h3>}

      <div className="flex-1 w-full min-h-0 relative group">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`${id}-gradient-created`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={`${id}-gradient-closed`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = height - paddingY - (ratio * chartHeight)
            return (
              <g key={ratio}>
                <line
                  x1={paddingX} y1={y} x2={width - paddingX} y2={y}
                  className="stroke-slate-100" strokeWidth="1" strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 10} y={y + 4}
                  textAnchor="end" className="text-[10px] fill-slate-400 font-medium"
                >
                  {Math.round(paddedMax * ratio)}
                </text>
              </g>
            )
          })}

          {/* Areas */}
          <motion.path
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
            d={createAreaPath(createdData)}
            fill={`url(#${id}-gradient-created)`}
            className="pointer-events-none"
          />
          <motion.path
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
            d={createAreaPath(closedData)}
            fill={`url(#${id}-gradient-closed)`}
            className="pointer-events-none"
          />

          {/* Lines */}
          <motion.path
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeInOut" }}
            d={createPath(createdData)}
            fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round"
          />
          <motion.path
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
            d={createPath(closedData)}
            fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round"
          />

          {/* Interactive Overlay & Points */}
          {data.map((d, i) => (
            <g key={i}>
              {/* X Axis Label */}
              <text
                x={getX(i)} y={height - 10}
                textAnchor="middle" className="text-xs fill-slate-500 font-medium"
                dy="0.5em"
              >
                {format(d.date, 'MMM d')}
              </text>

              {/* Hover Hotspot (Invisible Rect) */}
              <rect
                x={getX(i) - (chartWidth / data.length / 2)}
                y={paddingY}
                width={chartWidth / data.length}
                height={chartHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-crosshair"
              />

              {/* Active Points (Only visible on hover) */}
              {hoveredIndex === i && (
                <>
                  <line
                    x1={getX(i)} y1={paddingY} x2={getX(i)} y2={height - paddingY}
                    stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2"
                  />
                  <circle cx={getX(i)} cy={getY(d.created)} r="5" className="fill-indigo-500 stroke-white stroke-2" />
                  <circle cx={getX(i)} cy={getY(d.closed)} r="5" className="fill-emerald-500 stroke-white stroke-2" />
                  {/* Tooltip Card (Rendered via foreignObject) */}
                  <foreignObject x={getX(i) - 70} y={getY(d.created) - 95} width="140" height="90" style={{ pointerEvents: 'none', overflow: 'visible' }}>
                    <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-lg border border-slate-200 p-3 text-xs z-50">
                      <p className="font-bold text-slate-800 mb-2 border-b pb-1 border-slate-100">{format(d.date, 'MMM d')}</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-indigo-600 font-medium flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />Created</span>
                          <span className="font-bold text-slate-900">{d.created}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-emerald-600 font-medium flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Closed</span>
                          <span className="font-bold text-slate-900">{d.closed}</span>
                        </div>
                      </div>
                    </div>
                  </foreignObject>
                </>
              )}
            </g>
          ))}

        </svg>
      </div>

      {/* Modern Legend */}
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          Created
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-700">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          Closed
        </div>
      </div>
    </div>
  )
}
