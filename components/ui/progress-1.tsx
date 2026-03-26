'use client'

import { Progress } from '@ark-ui/react/progress'

import { cn } from '@/lib/utils'

export type LinearBasicProps = {
  className?: string
  /** Valor 0–100. `null` = indeterminado (carregamento sem percentual). */
  value?: number | null
  /** Só em modo não controlado; ignorado se `value` for passado. */
  defaultValue?: number
  /** Barra mais fina e estreita (intro / loading). */
  size?: 'sm' | 'md'
  /** Track translúcido + preenchimento branco (fundo preto). */
  light?: boolean
}

export default function LinearBasic({
  className,
  value,
  defaultValue = 65,
  size = 'md',
  light = false,
}: LinearBasicProps) {
  const controlled = value !== undefined

  return (
    <Progress.Root
      max={100}
      {...(controlled ? { value } : { defaultValue })}
      className={cn(
        'mx-auto w-full',
        size === 'sm' ? 'max-w-[200px]' : 'max-w-sm',
        className,
      )}
    >
      <Progress.Track
        className={cn(
          'w-full overflow-hidden rounded-full',
          size === 'sm' ? 'h-0.5' : 'h-2',
          light ? 'bg-white/20' : 'bg-[var(--color-muted-surface)]',
        )}
      >
        <Progress.Range
          className={cn(
            'h-full rounded-full',
            light ? 'bg-white' : 'bg-[var(--color-text-primary)]',
            controlled
              ? 'transition-[width] duration-150 ease-linear'
              : 'transition-[width] duration-300 ease-out',
            'data-[state=indeterminate]:w-[40%] data-[state=indeterminate]:min-w-[40%] data-[state=indeterminate]:animate-pulse',
            light &&
              'data-[state=indeterminate]:bg-white data-[state=indeterminate]:opacity-90',
          )}
        />
      </Progress.Track>
    </Progress.Root>
  )
}
