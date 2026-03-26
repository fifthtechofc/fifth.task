'use client'

import { cn } from '@/lib/utils'

export type LinearBasicProps = {
  className?: string
  value?: number | null
  defaultValue?: number
  size?: 'sm' | 'md'
  light?: boolean
}

export default function LinearBasic({
  className,
  value,
  defaultValue = 65,
  size = 'md',
  light = false,
}: LinearBasicProps) {
  const numericValue = value ?? defaultValue
  const isIndeterminate = value === null
  const clampedValue = Math.max(0, Math.min(100, numericValue))

  return (
    <div
      className={cn(
        'mx-auto w-full',
        size === 'sm' ? 'max-w-[200px]' : 'max-w-sm',
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={isIndeterminate ? undefined : clampedValue}
      aria-valuetext={isIndeterminate ? 'Carregando' : `${Math.round(clampedValue)}%`}
    >
      <div
        className={cn(
          'w-full overflow-hidden rounded-full',
          size === 'sm' ? 'h-0.5' : 'h-2',
          light ? 'bg-white/20' : 'bg-[var(--color-muted-surface)]',
        )}
      >
        <div
          className={cn(
            'h-full rounded-full',
            light ? 'bg-white' : 'bg-[var(--color-text-primary)]',
            isIndeterminate
              ? 'w-[40%] min-w-[40%] animate-pulse'
              : 'transition-[width] duration-150 ease-linear',
          )}
          style={isIndeterminate ? undefined : { width: `${clampedValue}%` }}
        />
      </div>
    </div>
  )
}
