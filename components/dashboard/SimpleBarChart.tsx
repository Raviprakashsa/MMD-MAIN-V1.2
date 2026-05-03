'use client'

import { useEffect, useRef } from 'react'

interface BarChartProps {
  data: {
    label: string
    value: number
  }[]
  title?: string
  color?: string
}

export function SimpleBarChart({ data, title, color = '#6366F1' }: Readonly<BarChartProps>) {
  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const bars = containerRef.current.querySelectorAll<HTMLDivElement>('.bar-segment')
    bars.forEach((bar, idx) => {
      const width = bar.dataset.width
      const minWidth = bar.dataset.minWidth
      setTimeout(() => {
        if (width) bar.style.width = `${width}%`
        if (minWidth) bar.style.minWidth = minWidth
      }, idx * 80) // Stagger animation
    })
  }, [data, color])

  return (
    <div ref={containerRef} className="space-y-1">
      {title && <h3 className="font-semibold mb-4 text-lg text-[var(--foreground)]">{title}</h3>}
      <div className="space-y-4">
        {data.map((item) => {
          const widthPercent = (item.value / maxValue) * 100
          const minWidthValue = item.value > 0 ? '8px' : '0'
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-[var(--foreground)] font-medium truncate max-w-[180px]" title={item.label}>
                  {item.label}
                </span>
                <span className="text-sm font-semibold text-[var(--foreground)] ml-2 tabular-nums">{item.value}</span>
              </div>
              <div className="h-4 bg-[var(--background-secondary)] rounded-full overflow-hidden relative">
                <div
                  className="bar-segment h-full rounded-full transition-all duration-700 ease-out"
                  data-width={widthPercent}
                  data-min-width={minWidthValue}
                  style={{
                    background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
                    width: '0%',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
