'use client'

import Image from 'next/image'

import NeuralBackground from '@/components/ui/flow-field-background'
import { IntroTimedProgressBar } from '@/components/ui/intro-timed-progress-bar'
import { cn } from '@/lib/utils'

/** Logo centralizada + barra (fundo preto, asset `public/logo-task.PNG`). */
export function IntroLogoScreen({
  className,
  durationMs,
  onBarComplete,
}: {
  className?: string
  durationMs: number
  onBarComplete?: () => void
}) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[300] overflow-hidden bg-black',
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      {/* Mesmo background do login */}
      <NeuralBackground
        className="absolute inset-0 z-0"
        color="#c7d1db"
        trailOpacity={0.2}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-black/40 via-transparent to-black/40" />

      {/* Mesmo glow “bolha” do login */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 z-[12] h-[500px] w-[500px] -translate-x-[38%] translate-y-[38%] rounded-full bg-gradient-to-r from-white/25 via-white/15 to-white/20 blur-3xl"
        aria-hidden
      />

      <div className="relative z-20 flex h-full w-full flex-col items-center justify-center gap-4 px-4 sm:px-6">
        {/* Mantém o mesmo efeito do login, mas com a logo `logo-task.PNG`. */}
        <div className="relative z-10 flex items-center justify-center">
          <Image
            src="/logo-task.PNG"
            alt="Task"
            width={423}
            height={590}
            priority
            quality={100}
            className="h-72 w-auto drop-shadow-[0_0_18px_rgba(255,255,255,0.28)] sm:h-80 md:h-96"
          />
        </div>
        {/* Barra próxima e sempre visível (fora do PNG). */}
        <div className="pointer-events-none relative z-30 -mt-10 sm:-mt-12 md:-mt-14">
          <IntroTimedProgressBar
            durationMs={durationMs}
            onComplete={onBarComplete}
            size="md"
            glow
            className="max-w-[min(78vw,240px)] sm:max-w-[260px]"
          />
        </div>
      </div>
    </div>
  )
}
