'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

import { AUTH_INTRO_STORAGE_KEY } from '@/lib/intro-storage'

const VapourIntro = dynamic(
  () => import('@/components/ui/vapour-text-effect').then((m) => m.VapourIntro),
  {
    ssr: false,
    loading: () => <div className="fixed inset-0 z-[300] bg-black" aria-hidden />,
  },
)

export default function Home() {
  const router = useRouter()

  return (
    <VapourIntro
      onSequenceComplete={() => {
        try {
          sessionStorage.setItem(AUTH_INTRO_STORAGE_KEY, '1')
        } catch {
          /* ignore */
        }
        router.replace('/login')
      }}
    />
  )
}
