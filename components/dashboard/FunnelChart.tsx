'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

interface FunnelChartProps {
  data: {
    label: string
    value: number
    color: string
    status?: string
  }[]
  title?: string
}

export function FunnelChart({ data, title }: Readonly<FunnelChartProps>) {
  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const bars = containerRef.current.querySelectorAll<HTMLDivElement>('.funnel-bar')
    bars.forEach((bar, idx) => {
      const width = bar.dataset.width
      const minWidth = bar.dataset.minWidth
      setTimeout(() => {
        if (width) bar.style.width = `${width}%`
        if (minWidth) bar.style.minWidth = minWidth
      }, idx * 100) // Stagger animation
    })
  }, [data])

  return (
    <div ref={containerRef} className="space-y-1">
      {title && <h3 className="font-semibold mb-4 text-lg text-[var(--foreground)]">{title}</h3>}
      <div className="space-y-3">
        {data.map((item, index) => {
          const widthPercent = (item.value / maxValue) * 100
          const minWidthValue = item.value > 0 ? '20px' : '0'
          const conversionRate =
            index > 0 && data[index - 1].value > 0
              ? Math.round((item.value / data[index - 1].value) * 100)
              : 100

          const row = (
            <div key={item.label} className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-[var(--foreground-muted)] font-medium">{item.label}</span>
                <span className="text-sm font-semibold text-[var(--foreground)] tabular-nums">{item.value}</span>
              </div>
              <div className="h-10 bg-[var(--background-secondary)] rounded-xl overflow-hidden relative">
                <div
                  className="funnel-bar h-full rounded-xl transition-all duration-700 ease-out flex items-center justify-between px-3"
                  data-width={widthPercent}
                  data-min-width={minWidthValue}
                  style={{
                    background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}cc 100%)`,
                    width: '0%',
                  }}
                >
                  {item.value > 0 && (
                    <>
                      <span className="text-xs font-semibold text-white/90">
                        {conversionRate}%
                      </span>
                      {index < data.length - 1 && (
                        <span className="text-xs text-white/60">→</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )

          if (item.status) {
            return (
              <Link key={item.label} href={`/dashboard/requirements?status=${item.status}`} className="block group">
                {row}
              </Link>
            )
          }

          return row
        })}
      </div>
    </div>
  )
}
