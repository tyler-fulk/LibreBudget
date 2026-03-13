import type { ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900 p-5 ${onClick ? 'cursor-pointer hover:border-slate-700 transition-colors' : ''} ${className}`}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  )
}
