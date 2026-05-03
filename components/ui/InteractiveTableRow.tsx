'use client'

import { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface InteractiveTableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode
  interactive?: boolean
  href?: string
}

export default function InteractiveTableRow({
  children,
  className,
  interactive = true,
  href,
  onClick,
  ...props
}: Readonly<InteractiveTableRowProps>) {
  const baseClassName = cn(interactive && 'table-row-interactive', className)

  if (href) {
    return (
      <a href={href} className={baseClassName} onClick={onClick as AnchorHTMLAttributes<HTMLAnchorElement>['onClick']}>
        {children}
      </a>
    )
  }

  return (
    <tr className={baseClassName} onClick={onClick} {...props}>
      {children}
    </tr>
  )
}
