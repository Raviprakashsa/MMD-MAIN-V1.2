'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedIconProps extends HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon
  animation?: 'bounce' | 'shake' | 'rotate' | 'morph' | 'none'
  rotated?: boolean
  morphed?: boolean
  size?: number
}

export default function AnimatedIcon({
  icon: Icon,
  animation = 'none',
  rotated = false,
  morphed = false,
  size = 20,
  className,
  ...props
}: Readonly<AnimatedIconProps>) {
  const animationClass = {
    bounce: 'icon-bounce',
    shake: 'icon-shake',
    rotate: 'icon-rotate',
    morph: 'icon-morph',
    none: '',
  }[animation]

  return (
    <div className={cn('inline-flex', className)} {...props}>
      <Icon
        size={size}
        className={animationClass}
        data-rotated={animation === 'rotate' ? rotated : undefined}
        data-morphed={animation === 'morph' ? morphed : undefined}
      />
    </div>
  )
}

interface CountUpProps {
  value: number
  duration?: number
  className?: string
}

export function CountUp({ value, duration = 1000, className }: Readonly<CountUpProps>) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: duration / 1000,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {value.toLocaleString('en-US')}
      </motion.span>
    </motion.span>
  )
}
