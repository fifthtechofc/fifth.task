import { AuthCardTransition } from '@/components/ui/auth-card-transition'
import { AuthRouteTransition } from '@/components/ui/auth-route-transition'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthRouteTransition>
      <AuthCardTransition>{children}</AuthCardTransition>
    </AuthRouteTransition>
  )
}
