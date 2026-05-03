'use client'

import { useRef, useMemo, useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * NeuroBackground - Optimised CSS-only Ambient Background
 * ========================================================
 * Replaced Three.js WebGL canvas with a pure CSS gradient animation.
 * 
 * WHY: The previous Three.js implementation ran a 400-particle WebGL Canvas
 * on every dashboard page – even during page navigation – causing significant
 * INP and LCP regressions (main-thread blocking during shader compile,
 * continuous rAF callbacks, pointer-tracking, and GPU composite layers).
 *
 * This replacement uses:
 *   - CSS @keyframes animations (compositor-only, zero JS per frame)
 *   - will-change: transform (promotes to GPU layer once, stays there)
 *   - prefers-reduced-motion: stops all animation for accessibility
 *   - No JavaScript after paint — zero INP cost
 */

interface NeuroBackgroundProps {
  readonly variant?: 'aurora' | 'constellation' | 'mesh'
  readonly className?: string
  readonly intensity?: number
  readonly transparentBg?: boolean
  readonly overlayMode?: 'soft' | 'none'
}

export default function NeuroBackground({
  className,
  intensity = 0.6,
  transparentBg = false,
  overlayMode = 'soft',
}: Readonly<NeuroBackgroundProps>) {
  const opacity = Math.min(0.18 * intensity, 0.22)

  return (
    <div
      className={cn('neuro-bg-root', className)}
      style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      {/* Base gradient */}
      {!transparentBg && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #f8faff 0%, #eef2ff 40%, #fafcff 100%)',
          }}
        />
      )}

      {/* Ambient blobs — promoted to compositor layer (transform + opacity only) */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '55%',
          height: '55%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse, rgba(99,102,241,${opacity}) 0%, transparent 70%)`,
          filter: 'blur(60px)',
          willChange: 'transform',
          animation: 'neuro-drift-a 20s ease-in-out infinite alternate',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '-12%',
          width: '48%',
          height: '48%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse, rgba(56,189,248,${opacity}) 0%, transparent 70%)`,
          filter: 'blur(60px)',
          willChange: 'transform',
          animation: 'neuro-drift-b 24s ease-in-out infinite alternate',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          left: '30%',
          width: '42%',
          height: '42%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse, rgba(139,92,246,${opacity * 0.7}) 0%, transparent 70%)`,
          filter: 'blur(70px)',
          willChange: 'transform',
          animation: 'neuro-drift-c 28s ease-in-out infinite alternate',
        }}
      />

      {/* Soft overlay */}
      {overlayMode === 'soft' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(248,250,255,0.5), transparent, rgba(248,250,255,0.3))',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Keyframe injector */}
      <style>{`
        @keyframes neuro-drift-a {
          0%   { transform: translate(0px, 0px) scale(1); }
          100% { transform: translate(40px, 30px) scale(1.08); }
        }
        @keyframes neuro-drift-b {
          0%   { transform: translate(0px, 0px) scale(1); }
          100% { transform: translate(-30px, 25px) scale(1.05); }
        }
        @keyframes neuro-drift-c {
          0%   { transform: translate(0px, 0px) scale(1); }
          100% { transform: translate(20px, -35px) scale(1.06); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="neuro-drift"] { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
