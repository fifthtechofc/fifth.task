import { AuthIntroGate } from '@/components/auth-intro-gate'
import { AuthCardTransition } from '@/components/ui/auth-card-transition'
import { AuthRouteTransition } from '@/components/ui/auth-route-transition'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthIntroGate>
      <AuthRouteTransition>
        <AuthCardTransition>{children}</AuthCardTransition>
      </AuthRouteTransition>
    </AuthIntroGate>
  )
}
