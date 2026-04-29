/**
 * Shell estático em tela cheia: fundo da página não participa da animação.
 * A troca animada fica no card dentro de `LoginOne`.
 */
export function AuthRouteTransition({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-0 flex h-dvh max-h-dvh w-full touch-manipulation items-center justify-center overflow-hidden overscroll-none bg-[var(--color-bg)] p-3 sm:p-4">
      {children}
    </div>
  )
}
